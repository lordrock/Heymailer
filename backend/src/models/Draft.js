const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: 'Untitled Draft' },
    subject: { type: String, trim: true, default: '' },
    preheader: { type: String, trim: true, default: '' },
    senderName: { type: String, trim: true, default: 'RoundTable' },
    senderEmail: { type: String, trim: true, lowercase: true, default: '' },
    replyTo: { type: String, trim: true, default: '' },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    htmlContent: { type: String, default: '' },
    textContent: { type: String, default: '' },

    recipientType: { type: String, enum: ['contact', 'group', 'mixed'], default: 'group' },
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContactGroup' }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_drafts' }
);

module.exports = mongoose.model('Draft', draftSchema);
