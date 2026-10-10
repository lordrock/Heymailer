const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

const contactSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'bounced', 'complained'],
      default: 'active',
    },
    tags: [{ type: String, trim: true }],
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],
    // Optional fields that power the HeyMailer-specific personalisation variables
    customFields: {
      totalSavings: { type: Number },
      depositAmount: { type: Number },
      interestAmount: { type: Number },
      maturityDate: { type: Date },
      thriftName: { type: String },
      contributionAmount: { type: Number },
      payoutDate: { type: Date },
    },
    source: { type: String, enum: ['manual', 'csv_import', 'api'], default: 'manual' },
  },
  { timestamps: true, collection: 'mail_contacts' }
);

contactSchema.index({ workspaceId: 1, email: 1 }, { unique: true, name: 'mail_workspace_contact_email_unique' });
contactSchema.index({ workspaceId: 1, firstName: 1, lastName: 1 });
contactSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Contact', contactSchema);
