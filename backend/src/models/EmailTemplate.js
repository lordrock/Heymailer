const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

const CATEGORIES = [
  'Marketing',
  'Savings',
  'Thrift',
  'Transactional',
  'Security',
  'Announcement',
  'General',
];

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'General' },
    subject: { type: String, required: true, trim: true },
    preheader: { type: String, trim: true, default: '' },
    htmlContent: { type: String, required: true },
    textContent: { type: String, required: true },
    description: { type: String, trim: true, default: '' },
    isSystem: { type: Boolean, default: false }, // seeded starter templates
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_email_templates' }
);

emailTemplateSchema.index({ name: 'text', description: 'text' });

emailTemplateSchema.statics.CATEGORIES = CATEGORIES;
emailTemplateSchema.plugin(tenantPlugin);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
