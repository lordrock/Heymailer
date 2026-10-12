const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    providerMessageId: { type: String, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'mail_webhook_events' }
);
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
