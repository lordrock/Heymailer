const mongoose = require('mongoose');

const contactGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'mail_contact_groups' }
);

module.exports = mongoose.model('ContactGroup', contactGroupSchema);
