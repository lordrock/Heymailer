const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

// Singleton settings document. Dashboard-provided SMTP app passwords are
// encrypted before storage and never returned in API responses.
const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main' },
    mailProvider: {
      type: String,
      enum: ['mailjet', 'resend', 'smtp'],
      default: () => String(process.env.MAIL_PROVIDER || 'mailjet').toLowerCase(),
    },

    senderName: { type: String, default: 'HeyMailer' },
    senderEmail: { type: String, default: '' },
    replyTo: { type: String, default: '' },
    unsubscribeEndpoint: { type: String, trim: true, default: '' },
    sendingDomain: { type: String, lowercase: true, trim: true, default: '' },
    domainStatus: { type: String, enum: ['not_configured', 'pending', 'verified', 'failed'], default: 'not_configured' },
    spfStatus: { type: String, enum: ['unknown', 'pending', 'verified', 'failed'], default: 'unknown' },
    dkimStatus: { type: String, enum: ['unknown', 'pending', 'verified', 'failed'], default: 'unknown' },
    dmarcStatus: { type: String, enum: ['unknown', 'pending', 'verified', 'failed'], default: 'unknown' },
    sendingEnabled: { type: Boolean, default: false },
    providerApiKeyEncrypted: { type: String, default: '', select: false },
    providerSecretEncrypted: { type: String, default: '', select: false },
    smtpHost: { type: String, trim: true, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, min: 1, max: 65535, default: 587 },
    smtpSecure: { type: Boolean, default: false },

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

settingsSchema.index({ workspaceId: 1, singleton: 1 }, { unique: true });
settingsSchema.plugin(tenantPlugin);

settingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ singleton: 'main' });
  if (!doc) {
    doc = await this.create({
      singleton: 'main',
      mailProvider: String(process.env.MAIL_PROVIDER || 'mailjet').toLowerCase(),
      senderName: process.env.RESEND_FROM_NAME || process.env.MAILJET_FROM_NAME || process.env.SMTP_FROM_NAME || 'HeyMailer',
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

settingsSchema.statics.getForWorkspace = async function getForWorkspace(workspaceId, includeSecrets = false) {
  let query = this.findOne({ workspaceId, singleton: 'main' });
  if (includeSecrets) query = query.select('+smtpAppPasswordOverride +providerApiKeyEncrypted +providerSecretEncrypted');
  let doc = await query;
  if (!doc) doc = await this.create({ workspaceId, singleton: 'main' });
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
