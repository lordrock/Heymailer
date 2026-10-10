const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const Settings = require('../models/Settings');
const { decryptSecret } = require('../utils/credentialCrypto');

let cachedTransporter = null;
let cachedKey = null;

function getMailProvider(settings) {
  return String(settings?.mailProvider || process.env.MAIL_PROVIDER || 'smtp').trim().toLowerCase();
}

function getSenderEmail(provider, settings) {
  if (settings?.workspaceId) return settings.senderEmail || '';
  if (provider === 'resend') return settings?.senderEmail || process.env.RESEND_FROM_EMAIL || '';
  if (provider === 'mailjet') return settings?.senderEmail || process.env.MAILJET_FROM_EMAIL || '';
  return settings?.senderEmail || settings?.smtpUser || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '';
}

function resendApiKey(settings) {
  const apiKey = settings?.providerApiKeyEncrypted ? decryptSecret(settings.providerApiKeyEncrypted) : settings?.workspaceId ? '' : process.env.RESEND_API_KEY || '';
  if (!apiKey) {
    throw Object.assign(new Error('Resend is not configured. Add RESEND_API_KEY.'), { status: 400 });
  }
  return apiKey;
}

async function resendRequest(path, options = {}, settings) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${resendApiKey(settings)}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HeyMailer-Mailer/1.0',
      ...options.headers,
    },
    signal: AbortSignal.timeout(20000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.message || data.name || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Resend: ${detail}`), { status: 400, providerStatus: response.status });
  }
  return data;
}

function mailjetCredentials(settings) {
  return {
    apiKey: settings?.providerApiKeyEncrypted ? decryptSecret(settings.providerApiKeyEncrypted) : settings?.workspaceId ? '' : process.env.MAILJET_API_KEY || '',
    secretKey: settings?.providerSecretEncrypted ? decryptSecret(settings.providerSecretEncrypted) : settings?.workspaceId ? '' : process.env.MAILJET_SECRET_KEY || '',
  };
}

function mailjetAuthHeader(settings) {
  const { apiKey, secretKey } = mailjetCredentials(settings);
  if (!apiKey || !secretKey) {
    throw Object.assign(new Error('Mailjet is not configured. Add MAILJET_API_KEY and MAILJET_SECRET_KEY.'), {
      status: 400,
    });
  }
  return `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`;
}

async function mailjetRequest(path, options = {}, settings) {
  const baseUrl = (process.env.MAILJET_API_BASE_URL || 'https://api.mailjet.com').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: mailjetAuthHeader(settings),
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
async function getTransporter(providedSettings) {
  const { user, pass, settings } = await getSmtpCredentials(providedSettings);
  const host = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(settings?.smtpPort || process.env.SMTP_PORT) || 587;
  const secure = settings?.smtpSecure ?? process.env.SMTP_SECURE === 'true';
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

async function getSmtpCredentials(providedSettings) {
  const settings = providedSettings || await Settings.findOne({ singleton: 'main' }).select('+smtpAppPasswordOverride');
  const user = settings?.smtpUser || (settings?.workspaceId ? '' : process.env.SMTP_USER);
  const storedPassword = settings?.smtpAppPasswordOverride;
  const pass = storedPassword ? decryptSecret(storedPassword) : settings?.workspaceId ? '' : process.env.SMTP_APP_PASSWORD;
  return { user, pass, settings };
}

function invalidateTransporterCache() {
  cachedTransporter = null;
  cachedKey = null;
}

async function verifyConnection(providedSettings) {
  const settings = providedSettings || await Settings.findOne({ singleton: 'main' });
  const provider = getMailProvider(settings);
  if (provider === 'mailjet') {
    await mailjetRequest('/v3/REST/myprofile?Limit=1', {}, settings);
    return true;
  }
  if (provider === 'resend') {
    const fromEmail = getSenderEmail(provider, settings);
    const senderName = settings?.senderName || process.env.RESEND_FROM_NAME || 'HeyMailer';
    if (!fromEmail) throw Object.assign(new Error('Resend sender email is not configured.'), { status: 400 });
    const senderHash = crypto.createHash('sha256').update(fromEmail).digest('hex').slice(0, 16);
    await resendRequest('/emails', {
      method: 'POST',
      headers: { 'Idempotency-Key': `heymailer-provider-check-${senderHash}` },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: ['delivered@resend.dev'],
        subject: 'HeyMailer Resend configuration check',
        text: 'Provider configuration check.',
      }),
    }, settings);
    return true;
  }
  const transporter = await getTransporter(settings);
  await transporter.verify();
  return true;
}

async function sendEmail({ to, subject, html, text, fromName, fromEmail: requestedFromEmail, replyTo, idempotencyKey, workspaceId, providedSettings, unsubscribeUrl }) {
  const settings = providedSettings || (workspaceId ? await Settings.getForWorkspace(workspaceId, true) : await Settings.findOne({ singleton: 'main' }).select('+smtpAppPasswordOverride +providerApiKeyEncrypted +providerSecretEncrypted'));
  const provider = getMailProvider(settings);
  const fromEmail = String(requestedFromEmail || getSenderEmail(provider, settings)).trim().toLowerCase();
  const senderName = fromName || settings?.senderName
    || (provider === 'mailjet' ? process.env.MAILJET_FROM_NAME : null)
    || (provider === 'resend' ? process.env.RESEND_FROM_NAME : process.env.SMTP_FROM_NAME)
    || 'HeyMailer';

  if (!fromEmail) {
    throw Object.assign(new Error('Sender email is not configured.'), { status: 400 });
  }
  if (workspaceId) {
    const fromDomain = fromEmail.split('@')[1] || '';
    if (!settings.sendingEnabled || settings.domainStatus !== 'verified') {
      throw Object.assign(new Error('Sending is disabled until the workspace domain is verified by a super admin.'), { status: 403 });
    }
    if (!settings.sendingDomain || fromDomain !== settings.sendingDomain) {
      throw Object.assign(new Error(`The From address must use the verified domain ${settings.sendingDomain}.`), { status: 400 });
    }
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
          Headers: unsubscribeUrl ? {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          } : undefined,
        }],
      }),
    }, settings);
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

  if (provider === 'resend') {
    const data = await resendRequest('/emails', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: [to],
        reply_to: replyTo || settings?.replyTo || fromEmail,
        subject,
        html,
        text,
        headers: unsubscribeUrl ? {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        } : undefined,
      }),
    }, settings);
    return {
      response: `Resend accepted (${data.id || 'no message id'})`,
      messageId: data.id,
      provider: 'resend',
    };
  }

  if (provider !== 'smtp') {
    throw Object.assign(new Error(`Unsupported MAIL_PROVIDER: ${provider}`), { status: 400 });
  }

  const transporter = await getTransporter(settings);

  const info = await transporter.sendMail({
    from: `"${senderName}" <${fromEmail}>`,
    to,
    replyTo: replyTo || settings?.replyTo || fromEmail,
    subject,
    html,
    text,
    headers: unsubscribeUrl ? {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    } : undefined,
  });

  return info;
}

module.exports = {
  getMailProvider,
  getSenderEmail,
  getTransporter,
  getSmtpCredentials,
  invalidateTransporterCache,
  verifyConnection,
  sendEmail,
};
