const crypto = require('crypto');
const { ImapFlow } = require('imapflow');
const Campaign = require('../models/Campaign');
const PlacementTest = require('../models/PlacementTest');
const SeedMailbox = require('../models/SeedMailbox');
const Settings = require('../models/Settings');
const { getRedisClient } = require('../config/redis');
const { decryptSecret } = require('../utils/credentialCrypto');
const { sendEmail } = require('./mailer');

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_POLL_MS = 60 * 1000;
let timer;
let localScanRunning = false;

function placementMetrics(test) {
  const metrics = {
    total: test?.results?.length || 0,
    inbox: 0, primary: 0, promotions: 0, social: 0, updates: 0,
    spam: 0, missing: 0, pending: 0, other: 0, failed: 0,
    estimatedInboxPercentage: null,
    providers: {},
  };
  for (const result of test?.results || []) {
    const provider = result.provider;
    if (!metrics.providers[provider]) metrics.providers[provider] = { total: 0, inbox: 0, primary: 0, promotions: 0, social: 0, updates: 0, spam: 0, missing: 0, pending: 0, other: 0, failed: 0 };
    const bucket = metrics.providers[provider];
    bucket.total += 1;
    if (result.status === 'failed') {
      metrics.failed += 1; bucket.failed += 1;
    } else {
      const placement = result.placement || 'pending';
      metrics[placement] = (metrics[placement] || 0) + 1;
      bucket[placement] = (bucket[placement] || 0) + 1;
      if (['primary', 'promotions', 'social', 'updates', 'inbox'].includes(placement)) metrics.inbox += 1;
    }
  }
  const settled = metrics.total - metrics.pending;
  metrics.estimatedInboxPercentage = settled ? Math.round((metrics.inbox / settled) * 1000) / 10 : null;
  return metrics;
}

function classifyPlacement(provider, mailbox, labels = []) {
  const normalizedLabels = [...labels].map((label) => String(label).toUpperCase());
  const path = `${mailbox?.path || ''} ${mailbox?.specialUse || ''}`.toLowerCase();
  if (normalizedLabels.some((label) => label === '\\SPAM' || label === 'SPAM') || /junk|spam|bulk/.test(path)) return 'spam';
  if (provider === 'gmail') {
    if (normalizedLabels.includes('CATEGORY_PROMOTIONS')) return 'promotions';
    if (normalizedLabels.includes('CATEGORY_SOCIAL')) return 'social';
    if (normalizedLabels.includes('CATEGORY_UPDATES')) return 'updates';
    if (normalizedLabels.includes('CATEGORY_PERSONAL') || normalizedLabels.includes('\\INBOX') || path.includes('inbox')) return 'primary';
  }
  if (normalizedLabels.includes('\\INBOX') || path.includes('inbox')) return 'inbox';
  return 'other';
}

async function startPlacementTest({ workspaceId, campaignId, createdBy, mode = 'preflight' }) {
  const campaign = await Campaign.findOne({ _id: campaignId, workspaceId });
  if (!campaign) throw Object.assign(new Error('Campaign not found.'), { status: 404 });
  const active = await PlacementTest.findOne({ workspaceId, campaignId, mode, status: 'running', expiresAt: { $gt: new Date() } });
  if (active) return active;
  const seeds = await SeedMailbox.find({ enabled: true }).select('+passwordEncrypted');
  if (!seeds.length) throw Object.assign(new Error('No enabled placement seed mailboxes are configured. Ask a super admin to add one.'), { status: 400 });

  const correlationId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (Number(process.env.PLACEMENT_TEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS));
  const test = await PlacementTest.create({
    workspaceId, campaignId, correlationId, mode, expiresAt, createdBy,
    results: seeds.map((seed) => ({ seedId: seed._id, provider: seed.provider, email: seed.email })),
  });
  const settings = await Settings.getForWorkspace(workspaceId, true);
  for (const result of test.results) {
    try {
      const info = await sendEmail({
        to: result.email,
        subject: campaign.subject,
        html: campaign.htmlContent,
        text: campaign.textContent,
        fromName: campaign.senderName,
        fromEmail: campaign.senderEmail,
        replyTo: campaign.replyTo,
        workspaceId,
        providedSettings: settings,
        idempotencyKey: `placement-${test._id}-${result.seedId}`,
        headers: { 'X-HeyMailer-Placement-ID': correlationId },
        tags: [{ name: 'placement_test', value: String(test._id) }],
      });
      result.providerMessageId = info.messageId;
    } catch (error) {
      result.status = 'failed';
      result.error = error.message.slice(0, 500);
    }
  }
  if (test.results.every((result) => result.status === 'failed')) {
    test.status = 'completed'; test.completedAt = new Date();
  }
  await test.save();
  return test;
}

async function inspectSeed(seed, correlationId) {
  const client = new ImapFlow({
    host: seed.host, port: seed.port, secure: seed.secure,
    auth: { user: seed.username, pass: decryptSecret(seed.passwordEncrypted) }, logger: false,
  });
  try {
    await client.connect();
    const mailboxes = await client.list();
    const searchable = mailboxes.filter((mailbox) => !mailbox.flags?.has?.('\\Noselect'));
    for (const mailbox of searchable) {
      const lock = await client.getMailboxLock(mailbox.path, { readOnly: true });
      try {
        const matches = await client.search({ header: { 'x-heymailer-placement-id': correlationId } }, { uid: true });
        const uid = matches.at(-1);
        if (!uid) continue;
        const message = await client.fetchOne(uid, { envelope: true, labels: true }, { uid: true });
        return { placement: classifyPlacement(seed.provider, mailbox, message?.labels || []), providerMessageId: message?.envelope?.messageId || '' };
      } finally {
        lock.release();
      }
    }
    return null;
  } finally {
    await client.logout().catch(() => {});
  }
}

async function scanPlacementTests() {
  if (localScanRunning) return;
  localScanRunning = true;
  const redis = getRedisClient();
  const lockKey = 'heymailer:lock:placement-scan';
  const lockValue = crypto.randomUUID();
  let locked = true;
  try {
    if (redis?.isOpen) locked = Boolean(await redis.set(lockKey, lockValue, { NX: true, PX: 55000 }));
    if (!locked) return;
    const tests = await PlacementTest.find({ status: 'running' }).sort({ startedAt: 1 }).limit(20);
    for (const test of tests) {
      const expired = test.expiresAt <= new Date();
      for (const result of test.results.filter((item) => item.status === 'pending')) {
        if (expired) {
          result.status = 'missing'; result.placement = 'missing';
          continue;
        }
        const seed = await SeedMailbox.findById(result.seedId).select('+passwordEncrypted');
        if (!seed || !seed.enabled) continue;
        try {
          const found = await inspectSeed(seed, test.correlationId);
          seed.lastCheckedAt = new Date(); seed.lastError = '';
          if (found) {
            result.status = 'found'; result.placement = found.placement; result.detectedAt = new Date();
            result.providerMessageId = result.providerMessageId || found.providerMessageId;
          }
        } catch (error) {
          seed.lastCheckedAt = new Date(); seed.lastError = error.message.slice(0, 500);
        }
        await seed.save();
      }
      if (test.results.every((item) => item.status !== 'pending')) {
        test.status = 'completed'; test.completedAt = new Date();
      }
      await test.save();
    }
  } finally {
    if (redis?.isOpen && locked) {
      const current = await redis.get(lockKey).catch(() => null);
      if (current === lockValue) await redis.del(lockKey).catch(() => {});
    }
    localScanRunning = false;
  }
}

function startPlacementProcessor() {
  if (process.env.PLACEMENT_PROCESSING_ENABLED === 'false' || timer) return;
  const interval = Math.max(15000, Number(process.env.PLACEMENT_POLL_INTERVAL_MS) || DEFAULT_POLL_MS);
  scanPlacementTests().catch((error) => console.error('[placement]', error.message));
  timer = setInterval(() => scanPlacementTests().catch((error) => console.error('[placement]', error.message)), interval);
  timer.unref?.();
}

module.exports = { placementMetrics, classifyPlacement, startPlacementTest, scanPlacementTests, startPlacementProcessor };
