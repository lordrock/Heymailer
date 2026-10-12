const Admin = require('../models/Admin');
const Invoice = require('../models/Invoice');
const PaymentWallet = require('../models/PaymentWallet');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

async function overview(_req, res) {
  const [wallets, plans, invoices, customers, activeSubscriptions] = await Promise.all([
    PaymentWallet.find().sort({ asset: 1, network: 1 }).lean(),
    Plan.find().sort({ sortOrder: 1, priceUsd: 1 }).lean(),
    Invoice.find().populate('userId', 'name email workspaceName').populate('planId', 'name').sort({ createdAt: -1 }).limit(100).lean(),
    Admin.countDocuments({ role: 'customer' }),
    Subscription.countDocuments({ status: 'active', endsAt: { $gt: new Date() } }),
  ]);
  res.json({ wallets, plans, invoices, stats: { customers, activeSubscriptions, pendingPayments: invoices.filter((item) => item.status === 'submitted').length } });
}

async function saveWallet(req, res) {
  const asset = String(req.body.asset || '').toUpperCase();
  const network = String(req.body.network || '').toUpperCase().trim();
  const address = String(req.body.address || '').trim();
  const exchangeRateUsd = Number(req.body.exchangeRateUsd);
  if (!['BTC', 'USDT'].includes(asset) || !network || address.length < 12 || !Number.isFinite(exchangeRateUsd) || exchangeRateUsd <= 0) {
    return res.status(400).json({ message: 'Asset, network, public wallet address, and a positive USD exchange rate are required.' });
  }
  const wallet = await PaymentWallet.findOneAndUpdate(
    { asset, network },
    {
      $set: {
        address,
        exchangeRateUsd,
        label: String(req.body.label || '').trim().slice(0, 100),
        instructions: String(req.body.instructions || '').trim().slice(0, 1500),
        confirmationsRequired: Math.max(0, Math.min(100, Number(req.body.confirmationsRequired) || 1)),
        enabled: req.body.enabled !== false,
        updatedBy: req.admin._id,
      },
    },
    { upsert: true, new: true, runValidators: true }
  );
  res.json({ wallet });
}

async function toggleWallet(req, res) {
  const wallet = await PaymentWallet.findByIdAndUpdate(req.params.id, { enabled: Boolean(req.body.enabled), updatedBy: req.admin._id }, { new: true });
  if (!wallet) return res.status(404).json({ message: 'Wallet not found.' });
  res.json({ wallet });
}

async function savePlan(req, res) {
  const plan = await Plan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Plan not found.' });
  ['name', 'description'].forEach((field) => {
    if (req.body[field] !== undefined) plan[field] = String(req.body[field]).trim();
  });
  ['priceUsd', 'intervalMonths', 'sortOrder'].forEach((field) => {
    if (req.body[field] !== undefined) plan[field] = Number(req.body[field]);
  });
  if (Array.isArray(req.body.features)) plan.features = req.body.features.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  if (req.body.limits) plan.limits = { ...plan.limits.toObject(), ...req.body.limits };
  if (req.body.active !== undefined) plan.active = Boolean(req.body.active);
  if (req.body.featured !== undefined) plan.featured = Boolean(req.body.featured);
  await plan.save();
  res.json({ plan });
}

async function reviewInvoice(req, res) {
  const action = String(req.body.action || '').toLowerCase();
  const requestKey = String(req.get('Idempotency-Key') || '').trim();
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ message: 'Action must be approve or reject.' });
  const invoice = await Invoice.findById(req.params.id).populate('planId');
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  if (!invoice.planId) return res.status(409).json({ message: 'The plan attached to this invoice no longer exists.' });
  if (invoice.status === 'paid' && requestKey && invoice.reviewIdempotencyKey === requestKey) {
    const subscription = await Subscription.findOne({ sourceInvoiceId: invoice._id });
    return res.json({ invoice, subscription, idempotentReplay: true, message: 'Payment is already paid and the subscription is active.' });
  }
  if (invoice.status === 'rejected' && requestKey && invoice.reviewIdempotencyKey === requestKey) {
    return res.json({ invoice, idempotentReplay: true, message: 'Payment is already rejected.' });
  }
  if (invoice.status === 'paid') return res.status(409).json({ message: 'This invoice has already been approved.' });
  if (invoice.status !== 'submitted') return res.status(409).json({ message: 'Only submitted payments can be reviewed.' });

  invoice.reviewedAt = new Date();
  invoice.reviewedBy = req.admin._id;
  invoice.reviewNote = String(req.body.reviewNote || '').trim().slice(0, 1000);
  invoice.reviewIdempotencyKey = /^[a-zA-Z0-9:_-]{8,128}$/.test(requestKey) ? requestKey : undefined;

  if (action === 'reject') {
    invoice.status = 'rejected';
    await Promise.all([
      invoice.save(),
      AuditLog.create({ actorId: req.admin._id, action: 'invoice.rejected', targetType: 'Invoice', targetId: invoice._id, metadata: { reviewNote: invoice.reviewNote } }),
    ]);
    return res.json({ invoice, message: 'Payment rejected. The customer may submit corrected transaction details.' });
  }

  const session = await mongoose.startSession();
  let subscription;
  try {
    await session.withTransaction(async () => {
      const currentInvoice = await Invoice.findOne({ _id: invoice._id, status: 'submitted' }).session(session);
      if (!currentInvoice) throw Object.assign(new Error('This payment has already been reviewed.'), { status: 409 });
      const now = new Date();
      const existing = await Subscription.findOne({ userId: invoice.userId }).session(session);
      const startsAt = existing?.status === 'active' && existing.endsAt > now ? existing.endsAt : now;
      const endsAt = new Date(startsAt);
      endsAt.setUTCMonth(endsAt.getUTCMonth() + (invoice.planSnapshot.intervalMonths || 1));
      subscription = await Subscription.findOneAndUpdate(
        { userId: invoice.userId },
        { planId: invoice.planId._id, status: 'active', startsAt, endsAt, activatedBy: req.admin._id, sourceInvoiceId: invoice._id },
        { upsert: true, new: true, runValidators: true, session }
      );
      currentInvoice.status = 'paid';
      currentInvoice.reviewedAt = invoice.reviewedAt;
      currentInvoice.reviewedBy = invoice.reviewedBy;
      currentInvoice.reviewNote = invoice.reviewNote;
      currentInvoice.reviewIdempotencyKey = invoice.reviewIdempotencyKey;
      await currentInvoice.save({ session });
      await AuditLog.create([{
        actorId: req.admin._id,
        action: 'invoice.approved',
        targetType: 'Invoice',
        targetId: invoice._id,
        metadata: { subscriptionId: subscription._id, endsAt: subscription.endsAt },
      }], { session });
      invoice.status = 'paid';
    });
  } finally {
    await session.endSession();
  }
  res.json({
    invoice,
    subscription,
    activation: { invoiceStatus: invoice.status, subscriptionStatus: subscription.status, endsAt: subscription.endsAt },
    message: 'Payment marked paid and subscription activated.',
  });
}

module.exports = { overview, saveWallet, toggleWallet, savePlan, reviewInvoice };
