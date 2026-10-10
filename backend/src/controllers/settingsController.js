const Settings = require('../models/Settings');
const EmailLog = require('../models/EmailLog');
const { getMailProvider, getSenderEmail, verifyConnection, invalidateTransporterCache, sendEmail } = require('../services/mailer');
const { encryptSecret, isEncrypted } = require('../utils/credentialCrypto');

async function getSettingsWithSecret() {
  const settings = await Settings.findOne({ singleton: 'main' }).select('+smtpAppPasswordOverride +providerApiKeyEncrypted +providerSecretEncrypted');
  if (!settings) return Settings.getSingleton();

  // Transparently migrate credentials stored by older versions.
  if (settings.smtpAppPasswordOverride && !isEncrypted(settings.smtpAppPasswordOverride)) {
    settings.smtpAppPasswordOverride = encryptSecret(settings.smtpAppPasswordOverride);
    await settings.save();
  }
  return settings;
}

function publicSettings(settings) {
  const obj = settings.toObject();
  delete obj.smtpAppPasswordOverride;
  delete obj.bounceLastUid;
  delete obj.providerApiKeyEncrypted;
  delete obj.providerSecretEncrypted;
  return obj;
}

async function get(req, res) {
  const settings = await getSettingsWithSecret();
  const mailProvider = getMailProvider(settings);
  const activeSenderEmail = getSenderEmail(mailProvider, settings);
  const providerConfigurations = {
    mailjet: Boolean(settings.providerApiKeyEncrypted && settings.providerSecretEncrypted && getSenderEmail('mailjet', settings)),
    resend: Boolean(settings.providerApiKeyEncrypted && getSenderEmail('resend', settings)),
    smtp: Boolean(settings.smtpUser && settings.smtpAppPasswordOverride),
  };
  res.json({
    settings: publicSettings(settings),
    mailProvider,
    activeSenderEmail,
    envConfigured: providerConfigurations[mailProvider],
    providerConfigurations,
    storedPasswordConfigured: Boolean(settings.smtpAppPasswordOverride),
  });
}

async function update(req, res) {
  const settings = await Settings.getSingleton();
  const previousProvider = settings.mailProvider;
  const fields = [
    'senderName',
    'websiteUrl', 'savingsUrl', 'thriftUrl', 'telegramUrl', 'supportEmail',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) settings[f] = req.body[f];
  });

  if (req.body.batchSize !== undefined) {
    const batchSize = Number(req.body.batchSize);
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
      return res.status(400).json({ message: 'Batch size must be a whole number between 1 and 1000.' });
    }
    settings.batchSize = batchSize;
  }

  if (req.body.batchDelayMs !== undefined) {
    const batchDelayMs = Number(req.body.batchDelayMs);
    if (!Number.isInteger(batchDelayMs) || batchDelayMs < 0 || batchDelayMs > 86400000) {
      return res.status(400).json({ message: 'Batch delay must be between 0 minutes and 24 hours.' });
    }
    settings.batchDelayMs = batchDelayMs;
  }
  if (req.body.mailProvider && req.body.mailProvider !== previousProvider) settings.smtpConnected = false;

  await settings.save();
  res.json({ settings: publicSettings(settings) });
}

async function clearSmtpPassword(req, res) {
  if (req.admin.role !== 'superadmin') return res.status(403).json({ message: 'Provider credentials are managed by a super admin.' });
  const settings = await Settings.findOne({ singleton: 'main' }).select('+smtpAppPasswordOverride');
  if (settings) {
    settings.smtpAppPasswordOverride = '';
    settings.smtpConnected = false;
    await settings.save();
  }
  invalidateTransporterCache();
  res.json({
    message: process.env.SMTP_APP_PASSWORD
      ? 'Saved SMTP password cleared. The environment password is now active.'
      : 'Saved SMTP password cleared. Add a new password before sending.',
  });
}

async function testSmtp(req, res) {
  const settings = await getSettingsWithSecret();
  const provider = getMailProvider(settings);
  try {
    await verifyConnection(settings);
    settings.smtpConnected = true;
    settings.smtpLastCheckedAt = new Date();
    await settings.save();
    const label = provider === 'mailjet' ? 'Mailjet API' : provider === 'resend' ? 'Resend API' : 'SMTP';
    res.json({ connected: true, provider, message: `${label} configuration verified.` });
  } catch (err) {
    settings.smtpConnected = false;
    settings.smtpLastCheckedAt = new Date();
    await settings.save();
    res.status(400).json({ connected: false, message: err.message });
  }
}

async function sendTestEmail(req, res) {
  const recipient = String(req.body.recipient || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return res.status(400).json({ message: 'Enter a valid test recipient email.' });
  }

  const subject = 'HeyMailer — delivery test';
  const text = 'Your HeyMailer provider configuration is working. This is a test email from the Settings dashboard.';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#17362b">
      <h1 style="font-size:22px">Email delivery test successful</h1>
      <p>Your HeyMailer configuration sent this message successfully.</p>
      <p style="color:#64748b;font-size:13px">Sent from the Settings dashboard.</p>
    </div>`;

  try {
    const info = await sendEmail({ to: recipient, subject, html, text, workspaceId: req.admin.workspaceId, providedSettings: settings });
    await EmailLog.create({
      recipientEmail: recipient,
      subject,
      status: 'sent',
      isTest: true,
      smtpResponse: info?.response || 'OK',
      sentAt: new Date(),
      workspaceId: req.admin.workspaceId,
    });
    res.json({ sent: true, message: `Test email sent to ${recipient}.` });
  } catch (err) {
    await EmailLog.create({
      recipientEmail: recipient,
      subject,
      status: 'failed',
      isTest: true,
      errorMessage: err.message,
    });
    res.status(400).json({ sent: false, message: `Test email failed: ${err.message}` });
  }
}

module.exports = { get, update, clearSmtpPassword, testSmtp, sendTestEmail };
