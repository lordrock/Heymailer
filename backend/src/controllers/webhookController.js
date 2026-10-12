const { Webhook } = require('svix');
const EmailLog = require('../models/EmailLog');
const WebhookEvent = require('../models/WebhookEvent');
const IntegrationSettings = require('../models/IntegrationSettings');
const { decryptSecret } = require('../utils/credentialCrypto');

async function resend(req, res) {
  const settings = await IntegrationSettings.findOne({ singleton: 'platform' }).select('+resendWebhookSecretEncrypted');
  const secret = settings?.resendWebhookSecretEncrypted
    ? decryptSecret(settings.resendWebhookSecretEncrypted)
    : process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: 'Resend webhook verification is not configured.' });

  let event;
  try {
    event = new Webhook(secret).verify(req.rawBody?.toString('utf8') || '', {
      'svix-id': req.get('svix-id'),
      'svix-timestamp': req.get('svix-timestamp'),
      'svix-signature': req.get('svix-signature'),
    });
  } catch (_) {
    return res.status(400).json({ message: 'Invalid webhook signature.' });
  }

  const eventId = req.get('svix-id');
  try {
    await WebhookEvent.create({
      provider: 'resend', eventId, eventType: event.type,
      providerMessageId: event.data?.email_id || '', payload: event,
    });
  } catch (error) {
    if (error?.code === 11000) return res.status(200).json({ received: true, duplicate: true });
    throw error;
  }

  const providerMessageId = event.data?.email_id;
  if (providerMessageId) {
    const update = { deliveryStatus: event.type.replace('email.', ''), deliveryEventAt: new Date(event.created_at || Date.now()) };
    if (event.type === 'email.delivered') update.deliveredAt = update.deliveryEventAt;
    if (event.type === 'email.opened') update.openedAt = update.deliveryEventAt;
    if (event.type === 'email.clicked') update.clickedAt = update.deliveryEventAt;
    if (event.type === 'email.bounced') update.status = 'bounced';
    if (event.type === 'email.complained') update.status = 'complained';
    if (event.type === 'email.failed') update.status = 'failed';
    await EmailLog.updateOne({ providerMessageId }, { $set: update });
  }
  return res.status(200).json({ received: true });
}

module.exports = { resend };
