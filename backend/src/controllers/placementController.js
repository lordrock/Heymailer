const Campaign = require('../models/Campaign');
const PlacementTest = require('../models/PlacementTest');
const { placementMetrics, startPlacementTest } = require('../services/placementEngine');

async function list(req, res) {
  const campaign = await Campaign.findOne({ _id: req.params.id, workspaceId: req.admin.workspaceId }).select('_id');
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  const tests = await PlacementTest.find({ workspaceId: req.admin.workspaceId, campaignId: campaign._id }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({ tests: tests.map((test) => ({ ...test, metrics: placementMetrics(test) })) });
}

async function create(req, res) {
  const test = await startPlacementTest({ workspaceId: req.admin.workspaceId, campaignId: req.params.id, createdBy: req.admin._id, mode: 'preflight' });
  res.status(201).json({ test: { ...test.toObject(), metrics: placementMetrics(test) }, message: 'Inbox placement test started.' });
}

module.exports = { list, create };
