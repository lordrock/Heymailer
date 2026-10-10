const mongoose = require('mongoose');
const tenantPlugin = require('./plugins/tenantPlugin');

const contactGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'mail_contact_groups' }
);

contactGroupSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
contactGroupSchema.plugin(tenantPlugin);

module.exports = mongoose.model('ContactGroup', contactGroupSchema);
