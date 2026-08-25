const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const Settings = require('../models/Settings');
const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const Campaign = require('../models/Campaign');
const Unsubscribe = require('../models/Unsubscribe');
const { getMailProvider, getSmtpCredentials } = require('./mailer');

const POLL_INTERVAL_MS = Number(process.env.BOUNCE_POLL_INTERVAL_MS) || 300000;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

let pollHandle = null;
let checking = false;

function messageText(parsed) {
  const attachments = (parsed.attachments || [])
    .map((item) => item.content?.toString('utf8') || '')
    .join('\n');
  return `${parsed.text || ''}\n${parsed.html || ''}\n${attachments}`;
}

function normalizeHeader(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value ? String(value) : '';
}

function extractReport(parsed) {
  const content = messageText(parsed);
  const failedHeader = normalizeHeader(parsed.headers.get('x-failed-recipients'));
  const complaint = /feedback-type\s*:\s*(abuse|fraud|virus|other)/i.test(content)
    || /report-type\s*=\s*["']?feedback-report/i.test(normalizeHeader(parsed.headers.get('content-type')));

  const targeted = [
    failedHeader,
    ...[...content.matchAll(/(?:Final-Recipient|Original-Recipient|Original-Rcpt-To)\s*:\s*(?:rfc822\s*;\s*)?([^\s<>;,]+)/gi)]
      .map((match) => match[1]),
  ].join(' ');
  const recipients = [...new Set((targeted.match(EMAIL_PATTERN) || []).map((email) => email.toLowerCase()))];

  const bounced = Boolean(failedHeader)
    || /report-type\s*=\s*["']?delivery-status/i.test(normalizeHeader(parsed.headers.get('content-type')))
    || /(?:Action\s*:\s*failed|Status\s*:\s*[45]\d\d|delivery[\s-]+status notification|undeliverable)/i.test(content);

  if (!recipients.length || (!bounced && !complaint)) return null;

  const diagnostic = content.match(/Diagnostic-Code\s*:\s*([^\r\n]+)/i)?.[1]
    || content.match(/Feedback-Type\s*:\s*([^\r\n]+)/i)?.[1]
    || parsed.subject
    || 'Mailbox delivery report';

  return {
    type: complaint ? 'complained' : 'bounced',
    recipients,
    reason: String(diagnostic).trim().slice(0, 1000),
  };
}

async function applyDeliveryEvent(email, report, parsed) {
  const log = await EmailLog.findOne({ recipientEmail: email, status: 'sent' }).sort({ sentAt: -1 });
  if (!log) return false;

  log.status = report.type;
  log.deliveryEventAt = parsed.date || new Date();
  log.deliveryEventReason = report.reason;
  log.deliveryReportMessageId = parsed.messageId || '';
  await log.save();

  await Contact.updateOne(
    { email },
    { $set: { status: report.type === 'complained' ? 'complained' : 'bounced' } }
  );

  if (report.type === 'complained') {
    await Unsubscribe.updateOne(
      { email },
      { $setOnInsert: { email }, $set: { reason: 'Abuse complaint report' } },
      { upsert: true }
    );
  }

  if (log.campaignId) {
    await Campaign.updateOne(
      { _id: log.campaignId },
      { $inc: { sentCount: -1, failedCount: 1 } }
    );
  }

  console.log(`[bounce] ${report.type}: ${email}`);
  return true;
}

async function checkMailbox() {
  if (checking || process.env.BOUNCE_PROCESSING_ENABLED === 'false') return;
  checking = true;

  let client;
  try {
    const { user, pass } = await getSmtpCredentials();
    if (!user || !pass) return;

    const settings = await Settings.findOne({ singleton: 'main' }).select('+bounceLastUid');
    if (!settings) return;

    client = new ImapFlow({
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: Number(process.env.IMAP_PORT) || 993,
      secure: process.env.IMAP_SECURE !== 'false',
      auth: { user, pass },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const newestUid = Math.max(0, Number(client.mailbox.uidNext || 1) - 1);

      // Establish a cursor on first use; only new reports are processed.
      if (!settings.bounceLastUid) {
        settings.bounceLastUid = newestUid;
      } else if (newestUid > settings.bounceLastUid) {
        for await (const message of client.fetch(
          `${settings.bounceLastUid + 1}:${newestUid}`,
          { uid: true, source: true },
          { uid: true }
        )) {
          const parsed = await simpleParser(message.source);
          const report = extractReport(parsed);
          if (report) {
            for (const email of report.recipients) {
              // eslint-disable-next-line no-await-in-loop
              await applyDeliveryEvent(email, report, parsed);
            }
          }
          settings.bounceLastUid = Math.max(settings.bounceLastUid, message.uid);
        }
      }

      settings.bounceConnected = true;
      settings.bounceLastCheckedAt = new Date();
      settings.bounceLastError = '';
      await settings.save();
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('[bounce] inbox check failed:', err.message);
    await Settings.updateOne(
      { singleton: 'main' },
      {
        $set: {
          bounceConnected: false,
          bounceLastCheckedAt: new Date(),
          bounceLastError: err.message.slice(0, 500),
        },
      }
    ).catch(() => {});
  } finally {
    if (client) await client.logout().catch(() => {});
    checking = false;
  }
}

function startBounceProcessor() {
  if (getMailProvider() !== 'smtp') {
    console.log('[bounce] inbox processor disabled for API mail provider; use provider webhooks for delivery events');
    return;
  }
  if (pollHandle || process.env.BOUNCE_PROCESSING_ENABLED === 'false') return;
  setTimeout(checkMailbox, 5000);
  pollHandle = setInterval(checkMailbox, POLL_INTERVAL_MS);
  console.log(`[bounce] inbox processor started (interval ${POLL_INTERVAL_MS}ms)`);
}

module.exports = { startBounceProcessor, checkMailbox, extractReport };
