const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: '' },
    priceUsd: { type: Number, required: true, min: 0 },
    intervalMonths: { type: Number, required: true, min: 1, max: 24, default: 1 },
    features: [{ type: String, trim: true }],
    limits: {
      contacts: { type: Number, min: 0, default: 500 },
      monthlyEmails: { type: Number, min: 0, default: 5000 },
      teamMembers: { type: Number, min: 1, default: 1 },
    },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'mail_plans' }
);

module.exports = mongoose.model('Plan', planSchema);
