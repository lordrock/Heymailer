const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, unique: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: { type: String, enum: ['active', 'past_due', 'expired', 'cancelled'], default: 'active', index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    sourceInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true, collection: 'mail_subscriptions' }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
