const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const { decryptSecret } = require('../utils/credentialCrypto');

let cachedTransporter = null;
let cachedKey = null;

/**
 * Builds (and caches) the Nodemailer transporter. The SMTP app password can
 * come from the .env file or from an admin-set override stored in Settings —
 * either way it is never sent back to the frontend.
 */
async function getTransporter() {
  const { user, pass } = await getSmtpCredentials();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true';

  const key = `${host}:${port}:${user}`;

  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }

  if (!user || !pass) {
    throw Object.assign(new Error('SMTP is not configured yet. Add SMTP credentials in Settings.'), {
      status: 400,
    });
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  cachedKey = key;

  return cachedTransporter;
}

async function getSmtpCredentials() {
  const settings = await Settings.findOne({ singleton: 'main' }).select('+smtpAppPasswordOverride');
  const user = settings?.smtpUser || process.env.SMTP_USER;
  const storedPassword = settings?.smtpAppPasswordOverride;
  const pass = storedPassword ? decryptSecret(storedPassword) : process.env.SMTP_APP_PASSWORD;
  return { user, pass, settings };
}

function invalidateTransporterCache() {
  cachedTransporter = null;
  cachedKey = null;
}

async function verifyConnection() {
  const transporter = await getTransporter();
  await transporter.verify();
  return true;
}

async function sendEmail({ to, subject, html, text, fromName, replyTo }) {
  const settings = await Settings.findOne({ singleton: 'main' });
  const transporter = await getTransporter();

  const fromEmail = settings?.senderEmail || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const senderName = fromName || settings?.senderName || process.env.SMTP_FROM_NAME || 'RoundTable';

  const info = await transporter.sendMail({
    from: `"${senderName}" <${fromEmail}>`,
    to,
    replyTo: replyTo || settings?.replyTo || fromEmail,
    subject,
    html,
    text,
  });

  return info;
}

module.exports = {
  getTransporter,
  getSmtpCredentials,
  invalidateTransporterCache,
  verifyConnection,
  sendEmail,
};
