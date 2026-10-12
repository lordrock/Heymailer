const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const PaymentWallet = require('../models/PaymentWallet');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Workspace = require('../models/Workspace');

const DOMAIN_PATTERN = /^(?=.{3,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

function idempotencyKey(req) {
  const value = String(req.get('Idempotency-Key') || '').trim();
  return /^[a-zA-Z0-9:_-]{8,128}$/.test(value) ? value : undefined;
}

function invoiceReference() {
  return `HYM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function publicWallet(wallet) {
  return {
    _id: wallet._id,
    asset: wallet.asset,
    network: wallet.network,
    address: wallet.address,
    label: wallet.label,
    exchangeRateUsd: wallet.exchangeRateUsd,
    confirmationsRequired: wallet.confirmationsRequired,
    instructions: wallet.instructions,
  };
}

async function listPlans(_req, res) {
  const plans = await Plan.find({ active: true }).sort({ sortOrder: 1, priceUsd: 1 }).lean();
  res.json({ plans });
}

async function overview(req, res) {
  await Invoice.updateMany(
    { userId: req.admin._id, status: 'awaiting_payment', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  const [plans, wallets, subscription, invoices] = await Promise.all([
    Plan.find({ active: true }).sort({ sortOrder: 1, priceUsd: 1 }).lean(),
    PaymentWallet.find({ enabled: true }).sort({ asset: 1, network: 1 }).lean(),
    Subscription.findOne({ userId: req.admin._id }).populate('planId').lean(),
    Invoice.find({ userId: req.admin._id }).populate('planId').sort({ createdAt: -1 }).limit(25).lean(),
  ]);
  res.json({ plans, wallets: wallets.map(publicWallet), subscription, invoices });
}

async function createInvoice(req, res) {
  const requestKey = idempotencyKey(req);
  if (requestKey) {
    const prior = await Invoice.findOne({ userId: req.admin._id, createIdempotencyKey: requestKey });
    if (prior) return res.status(200).json({ invoice: prior, idempotentReplay: true });
  }
  const plan = await Plan.findOne({ _id: req.body.planId, active: true });
  const wallet = await PaymentWallet.findOne({ _id: req.body.walletId, enabled: true });
  if (!plan || !wallet) return res.status(404).json({ message: 'The selected plan or payment wallet is unavailable.' });

  const existing = await Invoice.findOne({
    userId: req.admin._id,
    status: { $in: ['awaiting_payment', 'submitted'] },
  });
  if (existing) return res.status(409).json({ message: 'You already have an invoice awaiting payment or review.', invoice: existing });

  const precision = wallet.asset === 'BTC' ? 8 : 6;
  const amountCrypto = Number((plan.priceUsd / wallet.exchangeRateUsd).toFixed(precision));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  let invoice;
  try {
    invoice = await Invoice.create({
      reference: invoiceReference(),
      userId: req.admin._id,
      planId: plan._id,
      planSnapshot: { name: plan.name, priceUsd: plan.priceUsd, intervalMonths: plan.intervalMonths },
      asset: wallet.asset,
      network: wallet.network,
      walletAddress: wallet.address,
      exchangeRateUsd: wallet.exchangeRateUsd,
      amountUsd: plan.priceUsd,
      amountCrypto,
      expiresAt,
      createIdempotencyKey: requestKey,
    });
  } catch (error) {
    if (error?.code === 11000 && requestKey) {
      const prior = await Invoice.findOne({ userId: req.admin._id, createIdempotencyKey: requestKey });
      if (prior) return res.status(200).json({ invoice: prior, idempotentReplay: true });
    }
    throw error;
  }
  res.status(201).json({ invoice });
}

async function submitPayment(req, res) {
  const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.admin._id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  const requestKey = idempotencyKey(req);
  if (requestKey && invoice.submissionIdempotencyKey === requestKey && invoice.status === 'submitted') {
    return res.json({ invoice, idempotentReplay: true, message: 'Payment is already pending verification.' });
  }
  if (!['awaiting_payment', 'rejected'].includes(invoice.status)) {
    return res.status(409).json({ message: 'This invoice cannot accept another payment submission.' });
  }
  if (invoice.expiresAt < new Date()) {
    invoice.status = 'expired';
    await invoice.save();
    return res.status(409).json({ message: 'This payment quote has expired. Create a new invoice.' });
  }

  const transactionHash = String(req.body.transactionHash || '').trim();
  const accountName = String(req.body.accountName || '').trim().slice(0, 160);
  const hasRequestedDomain = req.body.hasRequestedDomain === true;
  const requestedDomain = String(req.body.requestedDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (accountName.length < 2) {
    return res.status(400).json({ message: 'Enter the account name used for the payment.' });
  }
  if (transactionHash && !/^[a-zA-Z0-9_-]{12,120}$/.test(transactionHash)) {
    return res.status(400).json({ message: 'The transaction hash format is invalid. Leave it blank if you do not have it.' });
  }
  if (hasRequestedDomain && !DOMAIN_PATTERN.test(requestedDomain)) {
    return res.status(400).json({ message: 'Enter a valid domain, such as example.com.' });
  }
  if (transactionHash) {
    const duplicate = await Invoice.exists({
      _id: { $ne: invoice._id }, asset: invoice.asset, network: invoice.network, transactionHash,
    });
    if (duplicate) return res.status(409).json({ message: 'This transaction hash has already been submitted.' });
  }

  invoice.transactionHash = transactionHash || undefined;
  invoice.accountName = accountName;
  invoice.payerAddress = String(req.body.payerAddress || '').trim().slice(0, 180);
  invoice.customerNote = String(req.body.customerNote || '').trim().slice(0, 1000);
  invoice.hasRequestedDomain = hasRequestedDomain;
  invoice.requestedDomain = hasRequestedDomain ? requestedDomain : '';
  invoice.submissionIdempotencyKey = requestKey;
  invoice.status = 'submitted';
  invoice.submittedAt = new Date();
  invoice.reviewedAt = undefined;
  invoice.reviewedBy = undefined;
  invoice.reviewNote = '';
  const workspaceUpdate = req.admin.workspaceId
    ? Workspace.updateOne(
      { _id: req.admin.workspaceId },
      { $set: { hasRequestedDomain, requestedDomain: hasRequestedDomain ? requestedDomain : '' } }
    )
    : Promise.resolve();
  await Promise.all([invoice.save(), workspaceUpdate]);
  res.json({ invoice, message: 'Payment submitted for verification.' });
}

module.exports = { listPlans, overview, createInvoice, submitPayment };
