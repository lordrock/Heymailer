require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const Workspace = require('../models/Workspace');
const { getPrimaryFrontendUrl } = require('../config/frontendUrl');
const { platformSettings, validatePlatformSettings } = require('../services/platformEmail');

async function checkAuthSetup() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'heymailer',
    serverSelectionTimeoutMS: 10000,
  });

  const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const admin = email ? await Admin.findOne({ email }) : null;
  const passwordMatches = admin && process.env.ADMIN_PASSWORD
    ? await admin.comparePassword(process.env.ADMIN_PASSWORD)
    : false;
  const accounts = await Admin.find({}).select('role status emailVerified workspaceId').lean();
  const [invoiceStatuses, subscriptionStatuses, workspaceStatuses] = await Promise.all([
    Invoice.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Workspace.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  const customers = accounts.filter((account) => account.role === 'customer');
  const mailSettings = platformSettings();
  let platformMail = { ready: true, provider: mailSettings.mailProvider, senderDomain: mailSettings.senderEmail.split('@')[1] || null };
  try {
    validatePlatformSettings(mailSettings);
  } catch (error) {
    platformMail = { ...platformMail, ready: false, error: error.message };
  }

  console.log(JSON.stringify({
    configuredAdmin: {
      accountExists: Boolean(admin),
      role: admin?.role || null,
      status: admin?.status || null,
      emailVerified: admin?.emailVerified ?? null,
      workspaceAttached: Boolean(admin?.workspaceId),
      configuredPasswordMatches: passwordMatches,
    },
    accounts: {
      total: accounts.length,
      customers: customers.length,
      activeCustomers: customers.filter((account) => account.status === 'active').length,
      unverifiedCustomers: customers.filter((account) => account.emailVerified === false).length,
      customersWithoutWorkspace: customers.filter((account) => !account.workspaceId).length,
    },
    billing: {
      invoicesByStatus: Object.fromEntries(invoiceStatuses.map((item) => [item._id, item.count])),
      subscriptionsByStatus: Object.fromEntries(subscriptionStatuses.map((item) => [item._id, item.count])),
      workspacesByStatus: Object.fromEntries(workspaceStatuses.map((item) => [item._id, item.count])),
    },
    links: { frontendUrl: getPrimaryFrontendUrl() },
    platformMail,
  }, null, 2));
}

checkAuthSetup()
  .catch((error) => {
    console.error(`Authentication setup check failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
