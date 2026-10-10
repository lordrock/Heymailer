const mongoose = require('mongoose');

const authTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ['verify_email', 'magic_login', 'reset_password'], required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date },
  },
  { timestamps: true, collection: 'mail_auth_tokens' }
);

module.exports = mongoose.model('AuthToken', authTokenSchema);
