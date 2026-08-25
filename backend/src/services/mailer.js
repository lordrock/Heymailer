const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const Settings = require('../models/Settings');
const { decryptSecret } = require('../utils/credentialCrypto');

let cachedTransporter = null;
let cachedKey = null;

function getMailProvider() {
  return String(process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

function mailjetCredentials() {
  return {
    apiKey: process.env.MAILJET_API_KEY || '',
    secretKey: process.env.MAILJET_SECRET_KEY || '',
  };
}

function mailjetAuthHeader() {
  const { apiKey, secretKey } = mailjetCredentials();
  if (!apiKey || !secretKey) {
    throw Object.assign(new Error('Mailjet is not configured. Add MAILJET_API_KEY and MAILJET_SECRET_KEY.'), {
      status: 400,
    });
  }
  return `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`;
}

async function mailjetRequest(path, options = {}) {
  const baseUrl = (process.env.MAILJET_API_BASE_URL || 'https://api.mailjet.com').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: mailjetAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.ErrorMessage || data.ErrorInfo || data.Message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Mailjet: ${detail}`), { status: 400, providerStatus: response.status });
  }
  return data;
}

function getIpv4Socket(options, callback) {
  dns.resolve4(options.host)
    .then((addresses) => {
      if (!addresses.length) throw new Error(`No IPv4 address found for ${options.host}.`);

      const connectionOptions = {
        host: addresses[0],
        port: options.port,
      };
      const socket = options.secure
        ? tls.connect({ ...connectionOptions, servername: options.host })
        : net.connect(connectionOptions);

      const connectedEvent = options.secure ? 'secureConnect' : 'connect';
      socket.once('error', callback);
      socket.once(connectedEvent, () => {
        socket.removeListener('error', callback);
        callback(null, {
          connection: socket,
          secured: Boolean(options.secure),
          servername: options.host,
        });
      });
    })
    .catch(callback);
}

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
  const forceIpv4 = process.env.SMTP_FORCE_IPV4 !== 'false';

  const passFingerprint = crypto.createHash('sha256').update(pass || '').digest('hex');
  const key = `${host}:${port}:${user}:${passFingerprint}:${forceIpv4 ? 'ipv4' : 'auto'}`;

  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }

  if (!user || !pass) {
    throw Object.assign(new Error('SMTP is not configured yet. Add SMTP credentials in Settings.'), {
      status: 400,
    });
  }

  const transportOptions = {
    host,
    port,
    secure,
    auth: { user, pass },
  };
  if (forceIpv4) transportOptions.getSocket = getIpv4Socket;

  cachedTransporter = nodemailer.createTransport(transportOptions);
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
  if (getMailProvider() === 'mailjet') {
    await mailjetRequest('/v3/REST/myprofile?Limit=1');
    return true;
  }
  const transporter = await getTransporter();
  await transporter.verify();
  return true;
}

async function sendEmail({ to, subject, html, text, fromName, replyTo }) {
  const settings = await Settings.findOne({ singleton: 'main' });
  const provider = getMailProvider();
  const fromEmail = settings?.senderEmail
    || (provider === 'mailjet' ? process.env.MAILJET_FROM_EMAIL : process.env.SMTP_FROM_EMAIL)
    || process.env.SMTP_USER;
  const senderName = fromName || settings?.senderName
    || (provider === 'mailjet' ? process.env.MAILJET_FROM_NAME : process.env.SMTP_FROM_NAME)
    || 'RoundTable';

  if (!fromEmail) {
    throw Object.assign(new Error('Sender email is not configured.'), { status: 400 });
  }

  if (provider === 'mailjet') {
    const data = await mailjetRequest('/v3.1/send', {
      method: 'POST',
      body: JSON.stringify({
        Messages: [{
          From: { Email: fromEmail, Name: senderName },
          To: [{ Email: to }],
          ReplyTo: replyTo || settings?.replyTo
            ? { Email: replyTo || settings.replyTo }
            : undefined,
          Subject: subject,
          HTMLPart: html,
          TextPart: text,
        }],
      }),
    });
    const result = data.Messages?.[0];
    if (!result || result.Status !== 'success') {
      throw Object.assign(new Error('Mailjet did not accept the email.'), { status: 400 });
    }
    return {
      response: `Mailjet accepted (${result.To?.[0]?.MessageID || 'no message id'})`,
      messageId: result.To?.[0]?.MessageUUID || result.To?.[0]?.MessageID,
      provider: 'mailjet',
    };
  }

  if (provider !== 'smtp') {
    throw Object.assign(new Error(`Unsupported MAIL_PROVIDER: ${provider}`), { status: 400 });
  }

  const transporter = await getTransporter();

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
  getMailProvider,
  getTransporter,
  getSmtpCredentials,
  invalidateTransporterCache,
  verifyConnection,
  sendEmail,
};
