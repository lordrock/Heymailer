const ContactGroup = require('../models/ContactGroup');
const Contact = require('../models/Contact');

async function list(req, res) {
  const groups = await ContactGroup.find({}).sort({ name: 1 });

  const counts = await Contact.aggregate([
    { $unwind: '$groups' },
    { $group: { _id: '$groups', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

  const withCounts = groups.map((g) => ({
    ...g.toObject(),
    contactCount: countMap[String(g._id)] || 0,
  }));

  res.json({ groups: withCounts });
}

async function create(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Group name is required.' });

  const group = await ContactGroup.create({ name, description });
  res.status(201).json({ group });
}

async function update(req, res) {
  const { name, description } = req.body;
  const group = await ContactGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });

  if (name !== undefined) group.name = name;
  if (description !== undefined) group.description = description;
  await group.save();

  res.json({ group });
}

async function remove(req, res) {
  const group = await ContactGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found.' });

  await Contact.updateMany({ groups: group._id }, { $pull: { groups: group._id } });
  await group.deleteOne();

  res.json({ message: 'Group deleted.' });
}

module.exports = { list, create, update, remove };
