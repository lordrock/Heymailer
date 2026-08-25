const EmailLog = require('../models/EmailLog');
const Contact = require('../models/Contact');
const EmailTemplate = require('../models/EmailTemplate');
const Campaign = require('../models/Campaign');
const Draft = require('../models/Draft');

async function summary(req, res) {
  const [sent, failed, contacts, templates, recentCampaigns, recentLogs, drafts] = await Promise.all([
    EmailLog.countDocuments({ status: 'sent' }),
    EmailLog.countDocuments({ status: 'failed' }),
    Contact.countDocuments({ status: 'active' }),
    EmailTemplate.countDocuments({}),
    Campaign.find({}).sort({ createdAt: -1 }).limit(5).select('name status recipientCount sentCount failedCount createdAt'),
    EmailLog.find({}).sort({ createdAt: -1 }).limit(8).populate('campaignId', 'name'),
    Draft.find({}).sort({ updatedAt: -1 }).limit(5).select('name updatedAt'),
  ]);

  res.json({
    emailsSent: sent,
    failed,
    contacts,
    templates,
    recentCampaigns,
    recentSends: recentLogs,
    drafts,
  });
}

module.exports = { summary };
