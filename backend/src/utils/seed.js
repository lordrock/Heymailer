/**
 * Run with: npm run seed
 * Idempotent — safe to run multiple times. Creates:
 *  - the single admin account (from ADMIN_EMAIL/ADMIN_PASSWORD in .env)
 *  - the 4 starter email templates from ./../templates/seed
 *  - a handful of default contact groups matching the PRD
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const EmailTemplate = require('../models/EmailTemplate');
const ContactGroup = require('../models/ContactGroup');
const Settings = require('../models/Settings');
const Plan = require('../models/Plan');

const seedTemplates = [
  require('../templates/seed/savingsInvitation01'),
  require('../templates/seed/savingsInvitation02'),
  require('../templates/seed/thriftInvitation'),
  require('../templates/seed/welcomeEmail'),
];

const DEFAULT_GROUPS = [
  { name: 'Savings Prospects', description: 'Leads interested in HeyMailer Savings' },
  { name: 'Thrift Prospects', description: 'Leads interested in HeyMailer Thrift' },
  { name: 'Existing Savers', description: 'Users with an active savings plan' },
  { name: 'Active Thrift Members', description: 'Users currently in a thrift circle' },
  { name: 'Registered Users', description: 'All signed-up users' },
  { name: 'Newsletter Subscribers', description: 'Opted in to general updates' },
];

const DEFAULT_PLANS = [
  { name: 'Starter', slug: 'starter', description: 'For individuals building their first audience.', priceUsd: 12, sortOrder: 1, limits: { contacts: 500, monthlyEmails: 5000, teamMembers: 1 }, features: ['500 contacts', '5,000 emails per month', 'Campaigns and templates', 'Email support'] },
  { name: 'Growth', slug: 'growth', description: 'For growing businesses sending consistently.', priceUsd: 29, sortOrder: 2, featured: true, limits: { contacts: 5000, monthlyEmails: 50000, teamMembers: 3 }, features: ['5,000 contacts', '50,000 emails per month', 'Multiple sending providers', 'Priority support'] },
  { name: 'Business', slug: 'business', description: 'For established teams with larger audiences.', priceUsd: 79, sortOrder: 3, limits: { contacts: 25000, monthlyEmails: 250000, teamMembers: 10 }, features: ['25,000 contacts', '250,000 emails per month', 'Team access', 'Advanced delivery support'] },
];

async function seedData() {
  // --- Admin ---
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'HeyMailer Admin';

  if (!adminEmail || !adminPassword) {
    console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin creation.');
  } else {
    const existing = await Admin.findOne({ email: adminEmail });
    if (existing) {
      if (existing.role !== 'superadmin') existing.role = 'superadmin';
      existing.emailVerified = true;
      existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
      if (!existing.workspaceName) existing.workspaceName = 'HeyMailer Administration';
      const passwordMatches = await existing.comparePassword(adminPassword);
      if (passwordMatches) {
        await existing.save();
        console.log(`[seed] admin credentials already current: ${adminEmail}`);
      } else {
        existing.passwordHash = await Admin.hashPassword(adminPassword);
        existing.name = adminName;
        await existing.save();
        console.log(`[seed] updated admin credentials from .env: ${adminEmail}`);
      }
    } else {
      const passwordHash = await Admin.hashPassword(adminPassword);
      await Admin.create({ name: adminName, email: adminEmail, passwordHash, role: 'superadmin', emailVerified: true, emailVerifiedAt: new Date(), workspaceName: 'HeyMailer Administration' });
      console.log(`[seed] created admin: ${adminEmail}`);
    }
  }

  // --- Subscription plans ---
  for (const plan of DEFAULT_PLANS) {
    await Plan.updateOne({ slug: plan.slug }, { $setOnInsert: plan }, { upsert: true });
  }

  // --- Templates ---
  for (const t of seedTemplates) {
    const existing = await EmailTemplate.findOne({ name: t.name });
    if (existing) {
      console.log(`[seed] template already exists: ${t.name}`);
      continue;
    }
    await EmailTemplate.create({ ...t, isSystem: true });
    console.log(`[seed] created template: ${t.name}`);
  }

  // --- Contact groups ---
  for (const g of DEFAULT_GROUPS) {
    const existing = await ContactGroup.findOne({ name: g.name });
    if (existing) continue;
    await ContactGroup.create(g);
    console.log(`[seed] created group: ${g.name}`);
  }

  // --- Settings singleton ---
  await Settings.getSingleton();
  console.log('[seed] settings initialised');

  console.log('[seed] done.');
}

async function run() {
  await connectDB();
  await seedData();
  process.exit(0);
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}

module.exports = seedData;
