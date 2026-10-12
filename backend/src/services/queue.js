/**
 * In-app sending queue.
 *
 * MongoDB remains the durable job ledger. Redis supplies a per-campaign
 * distributed lock so multiple Render instances cannot process one batch at
 * the same time.
 */
const Campaign = require('../models/Campaign');
const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const Settings = require('../models/Settings');
const Unsubscribe = require('../models/Unsubscribe');
const { sendEmail } = require('./mailer');
const { resolveVariables } = require('./templateEngine');
const { buildUnsubscribeUrl } = require('../utils/unsubscribeToken');
const { getRedisClient } = require('../config/redis');
const crypto = require('crypto');

const POLL_INTERVAL_MS = Number(process.env.QUEUE_POLL_INTERVAL_MS) || 10000;

let pollHandle = null;
let ticking = false;

async function withCampaignLock(campaignId, work, { skipIfLocked = true } = {}) {
  const redis = getRedisClient();
  if (!redis?.isReady) return work();
  const key = `heymailer:queue:campaign:${campaignId}`;
  const token = crypto.randomUUID();
  const ttl = Number(process.env.QUEUE_LOCK_TTL_MS) || 300000;
  const acquired = await redis.set(key, token, { NX: true, PX: ttl });
  if (!acquired) {
    if (skipIfLocked) return undefined;
    throw Object.assign(new Error('This campaign operation is already in progress.'), { status: 409 });
  }
  try {
    return await work();
  } finally {
    await redis.eval(
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
      { keys: [key], arguments: [token] }
    ).catch((error) => console.error('[queue] failed to release Redis lock:', error.message));
  }
}

async function resolveRecipients(campaign) {
  const Contact = require('../models/Contact');
  const ids = new Set(campaign.contactIds.map(String));

  if (campaign.groupIds?.length) {
    const groupContacts = await Contact.find({ workspaceId: campaign.workspaceId, groups: { $in: campaign.groupIds } }).select('_id');
    groupContacts.forEach((c) => ids.add(String(c._id)));
  }

  const unsubscribed = new Set(
    (await Unsubscribe.find({ workspaceId: campaign.workspaceId }).select('email')).map((u) => u.email.toLowerCase())
  );

  const contacts = await Contact.find({ workspaceId: campaign.workspaceId, _id: { $in: [...ids] } });
  return contacts.filter(
    (c) => c.status === 'active' && !unsubscribed.has(c.email.toLowerCase())
  );
}

/**
 * Kicks a campaign into the sending pipeline: creates a pending EmailLog per
 * eligible recipient (skips anyone unsubscribed/inactive) and flips the
 * campaign to "sending" so the poller picks it up on its next tick.
 */
async function enqueueCampaign(campaignId) {
  return withCampaignLock(campaignId.toString(), async () => {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw Object.assign(new Error('Campaign not found.'), { status: 404 });
    if (campaign.status === 'sending' || campaign.status === 'completed') return campaign;

    const recipients = await resolveRecipients(campaign);
    if (recipients.length === 0) {
      throw Object.assign(new Error('No eligible recipients (check groups/contacts and unsubscribe list).'), {
        status: 400,
      });
    }

    const logs = recipients.map((contact) => ({
    campaignId: campaign._id,
    workspaceId: campaign.workspaceId,
    contactId: contact._id,
    recipientEmail: contact.email,
    subject: campaign.subject,
    templateId: campaign.templateId,
    status: 'pending',
    }));
    await EmailLog.insertMany(logs);

    campaign.recipientCount = recipients.length;
    campaign.pendingCount = recipients.length;
    campaign.sentCount = 0;
    campaign.failedCount = 0;
    campaign.status = 'sending';
    campaign.startedAt = new Date();
    campaign.lastBatchAt = null;
    await campaign.save();

    ensurePolling();
    return campaign;
  }, { skipIfLocked: false });
}

async function sendOneLog(log, campaign, settings, baseUrl) {
  try {
    const contact = await Contact.findOne({ _id: log.contactId, workspaceId: campaign.workspaceId });
    const html = resolveVariables(campaign.htmlContent, { contact, settings, baseUrl });
    const text = resolveVariables(campaign.textContent, { contact, settings, baseUrl });
    const subject = resolveVariables(campaign.subject, { contact, settings, baseUrl });
    const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, log.recipientEmail, campaign.workspaceId, settings.unsubscribeEndpoint);

    const info = await sendEmail({
      to: log.recipientEmail,
      subject,
      html,
      text,
      fromName: campaign.senderName,
      fromEmail: campaign.senderEmail,
      replyTo: campaign.replyTo,
      idempotencyKey: `heymailer-campaign-${campaign._id}-email-${log._id}`,
      workspaceId: campaign.workspaceId,
      providedSettings: settings,
      unsubscribeUrl,
    });

    log.status = 'sent';
    log.smtpResponse = info?.response || 'OK';
    log.provider = info?.provider || '';
    log.providerMessageId = info?.messageId || '';
    log.deliveryStatus = 'sent';
    log.sentAt = new Date();
    log.attempt += 1;
    await log.save();

    campaign.sentCount += 1;
    campaign.pendingCount = Math.max(0, campaign.pendingCount - 1);
  } catch (err) {
    log.status = 'failed';
    log.errorMessage = err.message;
    log.attempt += 1;
    await log.save();

    campaign.failedCount += 1;
    campaign.pendingCount = Math.max(0, campaign.pendingCount - 1);
  }
}

async function processCampaignBatch(campaign, settings, baseUrl) {
  const batchSize = campaign.batchSize ?? settings.batchSize ?? 5;
  const logs = await EmailLog.find({ workspaceId: campaign.workspaceId, campaignId: campaign._id, status: 'pending' })
    .limit(batchSize);

  if (logs.length === 0) {
    campaign.status = 'completed';
    campaign.completedAt = new Date();
    await campaign.save();
    return;
  }

  for (const log of logs) {
    // eslint-disable-next-line no-await-in-loop
    await sendOneLog(log, campaign, settings, baseUrl);
  }

  campaign.lastBatchAt = new Date();
  await campaign.save();
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const sendingCampaigns = await Campaign.find({ status: 'sending' });
    if (sendingCampaigns.length === 0) return;

    const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 5100}`;

    for (const campaign of sendingCampaigns) {
      const settings = await Settings.getForWorkspace(campaign.workspaceId, true);
      const delay = campaign.batchDelayMs ?? settings.batchDelayMs ?? 0;
      const dueForNextBatch =
        !campaign.lastBatchAt || Date.now() - new Date(campaign.lastBatchAt).getTime() >= delay;

      if (dueForNextBatch) {
        // eslint-disable-next-line no-await-in-loop
        await withCampaignLock(campaign._id.toString(), () => processCampaignBatch(campaign, settings, baseUrl));
      }
    }
  } catch (err) {
    console.error('[queue] tick error:', err.message);
  } finally {
    ticking = false;
  }
}

function ensurePolling() {
  if (pollHandle) return;
  pollHandle = setInterval(tick, POLL_INTERVAL_MS);
  console.log(`[queue] poller started (interval ${POLL_INTERVAL_MS}ms)`);
}

/** Called once at boot so any campaign left "sending" after a restart resumes. */
async function resumeInFlightCampaigns() {
  const count = await Campaign.countDocuments({ status: 'sending' });
  if (count > 0) {
    console.log(`[queue] resuming ${count} in-flight campaign(s)`);
    ensurePolling();
  }
}

async function cancelCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw Object.assign(new Error('Campaign not found.'), { status: 404 });

  await EmailLog.updateMany(
    { campaignId: campaign._id, status: 'pending' },
    { $set: { status: 'failed', errorMessage: 'Cancelled by admin.' } }
  );

  campaign.status = 'cancelled';
  campaign.pendingCount = 0;
  await campaign.save();
  return campaign;
}

module.exports = {
  enqueueCampaign,
  cancelCampaign,
  resumeInFlightCampaigns,
  ensurePolling,
  _tick: tick, // exported for manual/testing triggers
};
