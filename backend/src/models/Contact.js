const mongoose = require('mongoose');

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
    // Optional fields that power the RoundTable-specific personalisation variables
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

contactSchema.index({ email: 1 }, { unique: true, name: 'mail_contact_email_unique' });
contactSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

module.exports = mongoose.model('Contact', contactSchema);
