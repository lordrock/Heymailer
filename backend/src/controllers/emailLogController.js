const EmailLog = require('../models/EmailLog');

async function list(req, res) {
  const { campaignId, status, search, page = 1, limit = 25 } = req.query;
  const filter = {};
  if (campaignId) filter.campaignId = campaignId;
  if (status && status !== 'All') filter.status = status;
  if (search) filter.recipientEmail = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .populate('campaignId', 'name')
      .populate('templateId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    EmailLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page: Number(page), limit: Number(limit) });
}

async function getOne(req, res) {
  const log = await EmailLog.findById(req.params.id).populate('campaignId', 'name').populate('templateId', 'name');
  if (!log) return res.status(404).json({ message: 'Log entry not found.' });
  res.json({ log });
}

module.exports = { list, getOne };
