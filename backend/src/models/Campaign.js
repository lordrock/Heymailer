const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

const STATUSES = ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'];

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String, trim: true, default: '' },
    senderName: { type: String, trim: true, default: 'HeyMailer' },
    senderEmail: { type: String, trim: true, lowercase: true, default: '' },
    replyTo: { type: String, trim: true },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    htmlContent: { type: String, required: true },
    textContent: { type: String, required: true },

    // Snapshot of the resolved recipient list at send time
    recipientType: { type: String, enum: ['contact', 'group', 'mixed'], default: 'group' },
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],

    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },

    status: { type: String, enum: STATUSES, default: 'draft' },

    // Snapshotted from Settings when the campaign is created so changing the
    // global defaults cannot unexpectedly alter a campaign already in flight.
    batchSize: { type: Number, min: 1, max: 1000, default: 5 },
    batchDelayMs: { type: Number, min: 0, max: 86400000, default: 120000 },

    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastBatchAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_campaigns' }
);

campaignSchema.statics.STATUSES = STATUSES;
campaignSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Campaign', campaignSchema);
