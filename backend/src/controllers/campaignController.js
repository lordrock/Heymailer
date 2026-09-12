const Campaign = require('../models/Campaign');
const Contact = require('../models/Contact');
const EmailLog = require('../models/EmailLog');
const Unsubscribe = require('../models/Unsubscribe');
const Settings = require('../models/Settings');
const { sanitizeEmailHtml } = require('../utils/sanitize');
const { resolveVariables } = require('../services/templateEngine');
const { sendEmail } = require('../services/mailer');
const queue = require('../services/queue');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const settings = await Settings.getSingleton();

  if (body.senderEmail && !EMAIL_PATTERN.test(String(body.senderEmail).trim())) {
    return res.status(400).json({ message: 'Enter a valid sender email address.' });
  }
  if (body.replyTo && !EMAIL_PATTERN.test(String(body.replyTo).trim())) {
    return res.status(400).json({ message: 'Enter a valid reply-to email address.' });
  }

  const batchSize = body.batchSize === undefined ? settings.batchSize : Number(body.batchSize);
  const batchDelayMs = body.batchDelayMs === undefined ? settings.batchDelayMs : Number(body.batchDelayMs);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    return res.status(400).json({ message: 'Batch size must be a whole number between 1 and 1000.' });
  }
  if (!Number.isInteger(batchDelayMs) || batchDelayMs < 0 || batchDelayMs > 86400000) {
    return res.status(400).json({ message: 'Batch delay must be between 0 minutes and 24 hours.' });
  }

  const campaign = await Campaign.create({
    name: body.name,
    subject: body.subject,
    preheader: body.preheader,
    senderName: body.senderName,
    senderEmail: body.senderEmail || settings.senderEmail,
    replyTo: body.replyTo,
    templateId: body.templateId || undefined,
    htmlContent: sanitizeEmailHtml(body.htmlContent),
    textContent: body.textContent,
    recipientType: body.recipientType || 'group',
    contactIds: body.contactIds || [],
    groupIds: body.groupIds || [],
    batchSize,
    batchDelayMs,
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

  if (req.body.senderEmail && !EMAIL_PATTERN.test(String(req.body.senderEmail).trim())) {
    return res.status(400).json({ message: 'Enter a valid sender email address.' });
  }
  if (req.body.replyTo && !EMAIL_PATTERN.test(String(req.body.replyTo).trim())) {
    return res.status(400).json({ message: 'Enter a valid reply-to email address.' });
  }

  if (req.body.batchSize !== undefined) {
    const batchSize = Number(req.body.batchSize);
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
      return res.status(400).json({ message: 'Batch size must be a whole number between 1 and 1000.' });
    }
    req.body.batchSize = batchSize;
  }
  if (req.body.batchDelayMs !== undefined) {
    const batchDelayMs = Number(req.body.batchDelayMs);
    if (!Number.isInteger(batchDelayMs) || batchDelayMs < 0 || batchDelayMs > 86400000) {
      return res.status(400).json({ message: 'Batch delay must be between 0 minutes and 24 hours.' });
    }
    req.body.batchDelayMs = batchDelayMs;
  }

  const fields = [
    'name', 'subject', 'preheader', 'senderName', 'senderEmail', 'replyTo', 'templateId',
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
  const { testEmail, htmlContent, textContent, subject, senderName, senderEmail, replyTo } = req.body;
  if (!testEmail) return res.status(400).json({ message: 'A test recipient email is required.' });
  if (senderEmail && !EMAIL_PATTERN.test(String(senderEmail).trim())) {
    return res.status(400).json({ message: 'Enter a valid sender email address.' });
  }
  if (replyTo && !EMAIL_PATTERN.test(String(replyTo).trim())) {
    return res.status(400).json({ message: 'Enter a valid reply-to email address.' });
  }

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
    await sendEmail({
      to: testEmail,
      subject: resolvedSubject,
      html,
      text,
      fromName: senderName,
      fromEmail: senderEmail,
      replyTo,
    });
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
    res.status(err.status || 502).json({ message: `Could not send test email: ${err.message}` });
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
