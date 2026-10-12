const mongoose = require('mongoose');

const seedMailboxSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['gmail', 'outlook', 'yahoo', 'aol', 'custom'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    host: { type: String, required: true, trim: true },
    port: { type: Number, default: 993 },
    secure: { type: Boolean, default: true },
    username: { type: String, required: true, trim: true },
    passwordEncrypted: { type: String, required: true, select: false },
    enabled: { type: Boolean, default: true, index: true },
    lastCheckedAt: Date,
    lastError: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_seed_mailboxes' }
);

module.exports = mongoose.model('SeedMailbox', seedMailboxSchema);
