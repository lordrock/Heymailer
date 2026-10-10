const Draft = require('../models/Draft');
const { sanitizeEmailHtml } = require('../utils/sanitize');

async function list(req, res) {
  const drafts = await Draft.find({}).sort({ updatedAt: -1 });
  res.json({ drafts });
}

async function getOne(req, res) {
  const draft = await Draft.findById(req.params.id);
  if (!draft) return res.status(404).json({ message: 'Draft not found.' });
  res.json({ draft });
}

async function upsert(req, res) {
  const body = req.body;
  const payload = {
    name: body.name || 'Untitled Draft',
    subject: body.subject || '',
    preheader: body.preheader || '',
    senderName: body.senderName || 'HeyMailer',
    senderEmail: body.senderEmail || '',
    replyTo: body.replyTo || '',
    templateId: body.templateId || undefined,
    htmlContent: sanitizeEmailHtml(body.htmlContent || ''),
    textContent: body.textContent || '',
    recipientType: body.recipientType || 'group',
    contactIds: body.contactIds || [],
    groupIds: body.groupIds || [],
    createdBy: req.admin._id,
  };

  if (req.params.id) {
    const draft = await Draft.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!draft) return res.status(404).json({ message: 'Draft not found.' });
    return res.json({ draft });
  }

  const draft = await Draft.create(payload);
  res.status(201).json({ draft });
}

async function remove(req, res) {
  const draft = await Draft.findById(req.params.id);
  if (!draft) return res.status(404).json({ message: 'Draft not found.' });
  await draft.deleteOne();
  res.json({ message: 'Draft deleted.' });
}

module.exports = { list, getOne, upsert, remove };
