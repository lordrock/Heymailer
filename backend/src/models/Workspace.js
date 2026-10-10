const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    sendingEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'mail_workspaces' }
);

module.exports = mongoose.model('Workspace', workspaceSchema);
