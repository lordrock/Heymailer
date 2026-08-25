const mongoose = require('mongoose');

const STATUSES = ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'];

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String, trim: true, default: '' },
    senderName: { type: String, trim: true, default: 'RoundTable' },
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

    batchSize: { type: Number, default: 5 },
    batchDelayMs: { type: Number, default: 120000 },

    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    lastBatchAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_campaigns' }
);

campaignSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Campaign', campaignSchema);
