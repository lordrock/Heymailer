const { sendEmail } = require('./mailer');

const PUBLIC_MAILBOX_DOMAINS = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com']);

function platformSettings() {
  const provider = String(process.env.PLATFORM_MAIL_PROVIDER || process.env.MAIL_PROVIDER || 'resend').toLowerCase();
  // Keep platform mail independent from tenant settings, while accepting the
  // provider-specific sender variables already used by existing deployments.
  // SMTP_USER is a safe last-resort sender for SMTP configurations where an
  // explicit FROM address was not previously set.
  const providerSender = provider === 'resend'
    ? process.env.RESEND_FROM_EMAIL
    : provider === 'mailjet'
      ? process.env.MAILJET_FROM_EMAIL
      : process.env.SMTP_FROM_EMAIL;
  const senderEmail = process.env.PLATFORM_FROM_EMAIL
    || providerSender
    || process.env.RESEND_FROM_EMAIL
    || process.env.MAILJET_FROM_EMAIL
    || process.env.SMTP_FROM_EMAIL
    || process.env.SMTP_USER
    || process.env.EMAIL_FROM
    || process.env.MAIL_FROM
    || process.env.SUPPORT_EMAIL
    || process.env.ADMIN_EMAIL
    || '';
  return {
    mailProvider: provider,
    senderName: process.env.PLATFORM_FROM_NAME || 'HeyMailer',
    senderEmail,
    replyTo: process.env.PLATFORM_REPLY_TO || process.env.SUPPORT_EMAIL || '',
    smtpUser: process.env.SMTP_USER || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
  };
}

function validatePlatformSettings(settings) {
  if (!['resend', 'mailjet', 'smtp'].includes(settings.mailProvider)) {
    throw Object.assign(new Error(`Unsupported platform mail provider: ${settings.mailProvider}`), { status: 503, code: 'MAIL_NOT_CONFIGURED' });
  }
  if (!settings.senderEmail) {
    throw Object.assign(new Error('Platform sender email is not configured. Set PLATFORM_FROM_EMAIL or the selected provider sender address.'), { status: 503, code: 'MAIL_NOT_CONFIGURED' });
  }
  const senderDomain = settings.senderEmail.split('@')[1]?.toLowerCase();
  if (settings.mailProvider === 'resend' && PUBLIC_MAILBOX_DOMAINS.has(senderDomain)) {
    throw Object.assign(new Error(`Resend cannot send from ${senderDomain}. Set RESEND_FROM_EMAIL to an address on a domain verified in Resend.`), { status: 503, code: 'MAIL_NOT_CONFIGURED' });
  }
  return settings;
}

function assertPlatformMailReady() {
  return validatePlatformSettings(platformSettings());
}

async function sendPlatformEmail({ to, subject, html, text }) {
  return sendEmail({ to, subject, html, text, providedSettings: validatePlatformSettings(platformSettings()) });
}

module.exports = { platformSettings, validatePlatformSettings, assertPlatformMailReady, sendPlatformEmail };
