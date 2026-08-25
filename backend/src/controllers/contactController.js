const { parse } = require('csv-parse/sync');
const Contact = require('../models/Contact');
const Unsubscribe = require('../models/Unsubscribe');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function list(req, res) {
  const { search, group, tag, status, page = 1, limit = 25 } = req.query;
  const filter = {};

  if (search) filter.$text = { $search: search };
  if (group) filter.groups = group;
  if (tag) filter.tags = tag;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [contacts, total] = await Promise.all([
    Contact.find(filter).populate('groups', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Contact.countDocuments(filter),
  ]);

  res.json({ contacts, total, page: Number(page), limit: Number(limit) });
}

async function getOne(req, res) {
  const contact = await Contact.findById(req.params.id).populate('groups', 'name');
  if (!contact) return res.status(404).json({ message: 'Contact not found.' });
  res.json({ contact });
}

async function create(req, res) {
  const { firstName, lastName, email, tags, groups, customFields } = req.body;

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  const contact = await Contact.create({
    firstName,
    lastName,
    email: email.toLowerCase().trim(),
    tags,
    groups,
    customFields,
    source: 'manual',
  });

  res.status(201).json({ contact });
}

async function update(req, res) {
  const { firstName, lastName, email, tags, groups, status, customFields } = req.body;

  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Contact not found.' });

  if (firstName !== undefined) contact.firstName = firstName;
  if (lastName !== undefined) contact.lastName = lastName;
  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Invalid email address.' });
    contact.email = email.toLowerCase().trim();
  }
  if (tags !== undefined) contact.tags = tags;
  if (groups !== undefined) contact.groups = groups;
  if (status !== undefined) contact.status = status;
  if (customFields !== undefined) contact.customFields = { ...contact.customFields, ...customFields };

  await contact.save();
  res.json({ contact });
}

async function remove(req, res) {
  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: 'Contact not found.' });
  await contact.deleteOne();
  res.json({ message: 'Contact deleted.' });
}

/**
 * CSV import. Expects a `firstName,lastName,email` header (extra columns are
 * ignored). Validates addresses, skips duplicates already in the DB, and
 * reports a per-row summary instead of failing the whole import on one bad
 * row.
 */
async function importCsv(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded.' });

  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8'), {
      columns: (header) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res.status(400).json({ message: `Could not parse CSV: ${err.message}` });
  }

  const groupIds = req.body.groupIds ? JSON.parse(req.body.groupIds) : [];

  const results = { imported: 0, skippedDuplicates: 0, invalid: 0, errors: [] };
  const existingEmails = new Set((await Contact.find({}).select('email')).map((c) => c.email));

  for (const [i, row] of records.entries()) {
    const email = (row.email || '').toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email)) {
      results.invalid += 1;
      results.errors.push(`Row ${i + 2}: invalid or missing email.`);
      continue;
    }
    if (existingEmails.has(email)) {
      results.skippedDuplicates += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await Contact.create({
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email,
      groups: groupIds,
      source: 'csv_import',
    });
    existingEmails.add(email);
    results.imported += 1;
  }

  res.json({ results });
}

async function unsubscribeList(req, res) {
  const list = await Unsubscribe.find({}).sort({ createdAt: -1 });
  res.json({ unsubscribed: list });
}

module.exports = { list, getOne, create, update, remove, importCsv, unsubscribeList };
