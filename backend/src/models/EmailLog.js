const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },

    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced', 'complained'],
      default: 'pending',
      index: true,
    },

    isTest: { type: Boolean, default: false },

    attempt: { type: Number, default: 0 },
    smtpResponse: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveryEventAt: { type: Date },
    deliveryEventReason: { type: String },
    deliveryReportMessageId: { type: String },
  },
  { timestamps: true, collection: 'mail_email_logs' }
);

emailLogSchema.index({ campaignId: 1, status: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
