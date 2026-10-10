const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

const unsubscribeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'mail_unsubscribes' }
);

unsubscribeSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
unsubscribeSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Unsubscribe', unsubscribeSchema);
