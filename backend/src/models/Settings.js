const mongoose = require('mongoose');

// Singleton settings document. Dashboard-provided SMTP app passwords are
// encrypted before storage and never returned in API responses.
const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true },
    mailProvider: {
      type: String,
      enum: ['mailjet', 'resend', 'smtp'],
      default: () => String(process.env.MAIL_PROVIDER || 'mailjet').toLowerCase(),
    },

    senderName: { type: String, default: 'RoundTable' },
    senderEmail: { type: String, default: '' },
    replyTo: { type: String, default: '' },

    websiteUrl: { type: String, default: '' },
    savingsUrl: { type: String, default: '' },
    thriftUrl: { type: String, default: '' },
    telegramUrl: { type: String, default: '' },
    supportEmail: { type: String, default: '' },

    smtpUser: { type: String, default: '' },
    smtpAppPasswordOverride: { type: String, default: '', select: false },
    smtpConnected: { type: Boolean, default: false },
    smtpLastCheckedAt: { type: Date },

    bounceLastUid: { type: Number, default: 0, select: false },
    bounceConnected: { type: Boolean, default: false },
    bounceLastCheckedAt: { type: Date },
    bounceLastError: { type: String, default: '' },

    batchSize: { type: Number, min: 1, max: 1000, default: 5 },
    batchDelayMs: { type: Number, min: 0, max: 86400000, default: 120000 },
  },
  { timestamps: true, collection: 'mail_settings' }
);

settingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ singleton: 'main' });
  if (!doc) {
    doc = await this.create({
      singleton: 'main',
      mailProvider: String(process.env.MAIL_PROVIDER || 'mailjet').toLowerCase(),
      senderName: process.env.RESEND_FROM_NAME || process.env.MAILJET_FROM_NAME || process.env.SMTP_FROM_NAME || 'RoundTable',
      senderEmail: process.env.RESEND_FROM_EMAIL || process.env.MAILJET_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || '',
      replyTo: process.env.RESEND_FROM_EMAIL || process.env.MAILJET_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || '',
      websiteUrl: process.env.WEBSITE_URL || '',
      savingsUrl: process.env.SAVINGS_URL || '',
      thriftUrl: process.env.THRIFT_URL || '',
      telegramUrl: process.env.TELEGRAM_URL || '',
      supportEmail: process.env.SUPPORT_EMAIL || '',
      smtpUser: process.env.SMTP_USER || '',
      batchSize: Number(process.env.QUEUE_BATCH_SIZE) || 5,
      batchDelayMs: Number(process.env.QUEUE_BATCH_DELAY_MS) || 120000,
    });
  }
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
