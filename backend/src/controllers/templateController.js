const EmailTemplate = require('../models/EmailTemplate');
const { sanitizeEmailHtml } = require('../utils/sanitize');

async function list(req, res) {
  const { category, search } = req.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (search) filter.$text = { $search: search };

  const templates = await EmailTemplate.find(filter).sort({ updatedAt: -1 });
  res.json({ templates, categories: EmailTemplate.CATEGORIES });
}

async function getOne(req, res) {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found.' });
  res.json({ template });
}

async function create(req, res) {
  const { name, category, subject, preheader, htmlContent, textContent, description } = req.body;

  const template = await EmailTemplate.create({
    name,
    category,
    subject,
    preheader,
    htmlContent: sanitizeEmailHtml(htmlContent),
    textContent,
    description,
    createdBy: req.admin._id,
  });

  res.status(201).json({ template });
}

async function update(req, res) {
  const { name, category, subject, preheader, htmlContent, textContent, description } = req.body;

  const template = await EmailTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found.' });

  if (name !== undefined) template.name = name;
  if (category !== undefined) template.category = category;
  if (subject !== undefined) template.subject = subject;
  if (preheader !== undefined) template.preheader = preheader;
  if (htmlContent !== undefined) template.htmlContent = sanitizeEmailHtml(htmlContent);
  if (textContent !== undefined) template.textContent = textContent;
  if (description !== undefined) template.description = description;

  await template.save();
  res.json({ template });
}

async function remove(req, res) {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found.' });
  if (template.isSystem) {
    return res.status(400).json({ message: 'Starter templates cannot be deleted, only duplicated or edited.' });
  }
  await template.deleteOne();
  res.json({ message: 'Template deleted.' });
}

async function duplicate(req, res) {
  const template = await EmailTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found.' });

  const copy = await EmailTemplate.create({
    name: `${template.name} (Copy)`,
    category: template.category,
    subject: template.subject,
    preheader: template.preheader,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    description: template.description,
    isSystem: false,
    createdBy: req.admin._id,
  });

  res.status(201).json({ template: copy });
}

module.exports = { list, getOne, create, update, remove, duplicate };
