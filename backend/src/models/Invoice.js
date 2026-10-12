const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planSnapshot: {
      name: String,
      priceUsd: Number,
      intervalMonths: Number,
    },
    asset: { type: String, enum: ['BTC', 'USDT'], required: true },
    network: { type: String, required: true, uppercase: true, trim: true },
    walletAddress: { type: String, required: true },
    exchangeRateUsd: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    amountCrypto: { type: Number, required: true },
    status: {
      type: String,
      enum: ['awaiting_payment', 'submitted', 'paid', 'rejected', 'expired', 'cancelled'],
      default: 'awaiting_payment',
      index: true,
    },
    transactionHash: { type: String, trim: true },
    accountName: { type: String, trim: true, default: '' },
    payerAddress: { type: String, trim: true, default: '' },
    customerNote: { type: String, trim: true, default: '' },
    hasRequestedDomain: { type: Boolean, default: false },
    requestedDomain: { type: String, trim: true, lowercase: true, default: '' },
    createIdempotencyKey: { type: String, trim: true },
    submissionIdempotencyKey: { type: String, trim: true },
    reviewIdempotencyKey: { type: String, trim: true },
    submittedAt: Date,
    expiresAt: { type: Date, required: true, index: true },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true, collection: 'mail_invoices' }
);

invoiceSchema.index(
  { asset: 1, network: 1, transactionHash: 1 },
  { unique: true, partialFilterExpression: { transactionHash: { $exists: true, $type: 'string' } } }
);
invoiceSchema.index(
  { userId: 1, createIdempotencyKey: 1 },
  { unique: true, partialFilterExpression: { createIdempotencyKey: { $exists: true, $type: 'string' } } }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
