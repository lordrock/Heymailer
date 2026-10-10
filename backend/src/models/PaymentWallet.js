const mongoose = require('mongoose');

const paymentWalletSchema = new mongoose.Schema(
  {
    asset: { type: String, enum: ['BTC', 'USDT'], required: true },
    network: { type: String, required: true, trim: true, uppercase: true },
    address: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
    exchangeRateUsd: { type: Number, required: true, min: 0.00000001 },
    confirmationsRequired: { type: Number, min: 0, max: 100, default: 1 },
    instructions: { type: String, trim: true, default: '' },
    enabled: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'mail_payment_wallets' }
);

paymentWalletSchema.index({ asset: 1, network: 1 }, { unique: true });

module.exports = mongoose.model('PaymentWallet', paymentWalletSchema);
