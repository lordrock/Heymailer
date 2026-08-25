const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const EmailLog = require('../models/EmailLog');
const Unsubscribe = require('../models/Unsubscribe');
const Settings = require('../models/Settings');
const { sanitizeEmailHtml } = require('../utils/sanitize');
const { resolveVariables } = require('../services/templateEngine');
const { sendEmail } = require('../services/mailer');
const queue = require('../services/queue');

async function list(req, res) {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;

  const campaigns = await Campaign.find(filter).populate('templateId', 'name').sort({ createdAt: -1 });
  res.json({ campaigns });
}

async function getOne(req, res) {
  const campaign = await Campaign.findById(req.params.id).populate('templateId', 'name').populate('groupIds', 'name');
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });

  const logCounts = await EmailLog.aggregate([
    { $match: { campaignId: campaign._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.json({ campaign, logCounts });
}

async function resolveRecipientPreview(req, res) {
  const { contactIds = [], groupIds = [] } = req.body;
  const ids = new Set(contactIds);

  if (groupIds.length) {
    const groupContacts = await Contact.find({ groups: { $in: groupIds } }).select('_id');
    groupContacts.forEach((c) => ids.add(String(c._id)));
  }

  const unsubscribed = new Set((await Unsubscribe.find({}).select('email')).map((u) => u.email.toLowerCase()));
  const contacts = await Contact.find({ _id: { $in: [...ids] } });
  const eligible = contacts.filter((c) => c.status === 'active' && !unsubscribed.has(c.email.toLowerCase()));

  res.json({ totalResolved: contacts.length, eligibleCount: eligible.length, excludedCount: contacts.length - eligible.length });
}

async function create(req, res) {
  const body = req.body;

  const campaign = await Campaign.create({
    name: body.name,
    subject: body.subject,
    preheader: body.preheader,
    senderName: body.senderName,
    replyTo: body.replyTo,
    templateId: body.templateId || undefined,
    htmlContent: sanitizeEmailHtml(body.htmlContent),
    textContent: body.textContent,
    recipientType: body.recipientType || 'group',
    contactIds: body.contactIds || [],
    groupIds: body.groupIds || [],
    batchSize: body.batchSize || undefined,
    batchDelayMs: body.batchDelayMs || undefined,
    status: 'draft',
    createdBy: req.admin._id,
  });

  res.status(201).json({ campaign });
}

async function update(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  if (!['draft', 'scheduled'].includes(campaign.status)) {
    return res.status(400).json({ message: `Cannot edit a campaign that is already ${campaign.status}.` });
  }

  const fields = [
    'name', 'subject', 'preheader', 'senderName', 'replyTo', 'templateId',
    'recipientType', 'contactIds', 'groupIds', 'batchSize', 'batchDelayMs',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) campaign[f] = req.body[f];
  });
  if (req.body.htmlContent !== undefined) campaign.htmlContent = sanitizeEmailHtml(req.body.htmlContent);
  if (req.body.textContent !== undefined) campaign.textContent = req.body.textContent;

  await campaign.save();
  res.json({ campaign });
}

async function remove(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  if (campaign.status === 'sending') {
    return res.status(400).json({ message: 'Cancel the campaign before deleting it.' });
  }
  await EmailLog.deleteMany({ campaignId: campaign._id });
  await campaign.deleteOne();
  res.json({ message: 'Campaign deleted.' });
}

async function sendTest(req, res) {
  const { testEmail, htmlContent, textContent, subject } = req.body;
  if (!testEmail) return res.status(400).json({ message: 'A test recipient email is required.' });

  const settings = await Settings.getSingleton();
  const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 5100}`;
  const fakeContact = { firstName: 'Test', lastName: 'User', email: testEmail, customFields: {
    totalSavings: 150000, depositAmount: 20000, interestAmount: 3000,
    maturityDate: new Date(), thriftName: 'Sample Thrift Circle',
    contributionAmount: 10000, payoutDate: new Date(),
  } };

  const html = resolveVariables(sanitizeEmailHtml(htmlContent), { contact: fakeContact, settings, baseUrl });
  const text = resolveVariables(textContent, { contact: fakeContact, settings, baseUrl });
  const resolvedSubject = resolveVariables(`[TEST] ${subject || ''}`, { contact: fakeContact, settings, baseUrl });

  try {
    await sendEmail({ to: testEmail, subject: resolvedSubject, html, text });
    await EmailLog.create({
      recipientEmail: testEmail,
      subject: resolvedSubject,
      status: 'sent',
      isTest: true,
      sentAt: new Date(),
    });
    res.json({ message: `Test email sent to ${testEmail}.` });
  } catch (err) {
    await EmailLog.create({
      recipientEmail: testEmail,
      subject: resolvedSubject,
      status: 'failed',
      isTest: true,
      errorMessage: err.message,
    });
    res.status(500).json({ message: `Could not send test email: ${err.message}` });
  }
}

async function startSend(req, res) {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  if (campaign.status === 'sending') return res.status(400).json({ message: 'Campaign is already sending.' });
  if (campaign.status === 'completed') return res.status(400).json({ message: 'Campaign has already been sent.' });

  try {
    const updated = await queue.enqueueCampaign(campaign._id);
    res.json({ campaign: updated, message: 'Campaign queued for sending.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function cancelSend(req, res) {
  try {
    const campaign = await queue.cancelCampaign(req.params.id);
    res.json({ campaign, message: 'Campaign cancelled.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  list, getOne, create, update, remove,
  resolveRecipientPreview, sendTest, startSend, cancelSend,
};
