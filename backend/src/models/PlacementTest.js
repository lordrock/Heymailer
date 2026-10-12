const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  seedId: { type: mongoose.Schema.Types.ObjectId, ref: 'SeedMailbox', required: true },
  provider: { type: String, required: true },
  email: { type: String, required: true },
  providerMessageId: String,
  status: { type: String, enum: ['pending', 'found', 'missing', 'failed'], default: 'pending' },
  placement: { type: String, enum: ['primary', 'promotions', 'social', 'updates', 'inbox', 'spam', 'other', 'missing', 'pending'], default: 'pending' },
  detectedAt: Date,
  error: { type: String, default: '' },
}, { _id: false });

const placementTestSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    correlationId: { type: String, required: true, unique: true, index: true },
    mode: { type: String, enum: ['preflight', 'live'], default: 'preflight' },
    status: { type: String, enum: ['running', 'completed'], default: 'running', index: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    completedAt: Date,
    results: [resultSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_placement_tests' }
);

module.exports = mongoose.model('PlacementTest', placementTestSchema);
