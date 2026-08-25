const mongoose = require('mongoose');

const unsubscribeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    reason: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'mail_unsubscribes' }
);

module.exports = mongoose.model('Unsubscribe', unsubscribeSchema);
