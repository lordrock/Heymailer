const { sendEmail } = require('./mailer');

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

async function sendPlatformEmail({ to, subject, html, text }) {
  return sendEmail({ to, subject, html, text, providedSettings: platformSettings() });
}

module.exports = { sendPlatformEmail };
