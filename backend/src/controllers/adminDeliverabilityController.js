const { ImapFlow } = require('imapflow');
const IntegrationSettings = require('../models/IntegrationSettings');
const SeedMailbox = require('../models/SeedMailbox');
const { encryptSecret, decryptSecret } = require('../utils/credentialCrypto');

function publicSeed(seed) {
  const value = seed.toObject ? seed.toObject() : seed;
  delete value.passwordEncrypted;
  return { ...value, passwordConfigured: Boolean(seed.passwordEncrypted) };
}

function webhookUrl() {
  return `${String(process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 5100}`).replace(/\/$/, '')}/api/webhooks/resend`;
}

async function overview(_req, res) {
  const [settings, seeds] = await Promise.all([
    IntegrationSettings.findOne({ singleton: 'platform' }).select('+resendWebhookSecretEncrypted'),
    SeedMailbox.find().select('+passwordEncrypted').sort({ provider: 1, email: 1 }),
  ]);
  res.json({
    webhook: { url: webhookUrl(), configured: Boolean(settings?.resendWebhookSecretEncrypted || process.env.RESEND_WEBHOOK_SECRET) },
    seeds: seeds.map(publicSeed),
  });
}

async function saveWebhook(req, res) {
  const secret = String(req.body.signingSecret || '').trim();
  if (!secret) return res.status(400).json({ message: 'Enter the Resend webhook signing secret.' });
  await IntegrationSettings.findOneAndUpdate(
    { singleton: 'platform' },
    { $set: { resendWebhookSecretEncrypted: encryptSecret(secret) } },
    { upsert: true, new: true }
  );
  res.json({ message: 'Resend webhook signing secret saved securely.', webhook: { url: webhookUrl(), configured: true } });
}

async function saveSeed(req, res) {
  const provider = String(req.body.provider || '').toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!['gmail', 'outlook', 'yahoo', 'aol', 'custom'].includes(provider) || !email || !req.body.host || (!req.params.id && !password)) {
    return res.status(400).json({ message: 'Provider, email, IMAP host, and credentials are required.' });
  }
  const seed = req.params.id ? await SeedMailbox.findById(req.params.id).select('+passwordEncrypted') : new SeedMailbox();
  if (!seed) return res.status(404).json({ message: 'Seed mailbox not found.' });
  seed.provider = provider;
  seed.name = String(req.body.name || email).trim().slice(0, 100);
  seed.email = email;
  seed.host = String(req.body.host).trim();
  seed.port = Number(req.body.port) || 993;
  seed.secure = req.body.secure !== false;
  seed.username = String(req.body.username || email).trim();
  seed.enabled = req.body.enabled !== false;
  seed.createdBy = seed.createdBy || req.admin._id;
  if (password) seed.passwordEncrypted = encryptSecret(password);
  await seed.save();
  res.json({ seed: publicSeed(seed), message: 'Seed mailbox saved.' });
}

async function testSeed(req, res) {
  const seed = await SeedMailbox.findById(req.params.id).select('+passwordEncrypted');
  if (!seed) return res.status(404).json({ message: 'Seed mailbox not found.' });
  const client = new ImapFlow({ host: seed.host, port: seed.port, secure: seed.secure, auth: { user: seed.username, pass: decryptSecret(seed.passwordEncrypted) }, logger: false });
  try {
    await client.connect();
    await client.mailboxOpen('INBOX', { readOnly: true });
    seed.lastCheckedAt = new Date(); seed.lastError = '';
    await seed.save();
    res.json({ message: 'Seed mailbox connection succeeded.' });
  } catch (error) {
    seed.lastCheckedAt = new Date(); seed.lastError = error.message.slice(0, 500);
    await seed.save();
    res.status(400).json({ message: `Mailbox connection failed: ${error.message}` });
  } finally {
    await client.logout().catch(() => {});
  }
}

async function removeSeed(req, res) {
  const seed = await SeedMailbox.findByIdAndDelete(req.params.id);
  if (!seed) return res.status(404).json({ message: 'Seed mailbox not found.' });
  res.json({ message: 'Seed mailbox removed.' });
}

module.exports = { overview, saveWebhook, saveSeed, testSeed, removeSeed };
