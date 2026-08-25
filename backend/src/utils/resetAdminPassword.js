require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

async function resetAdminPassword() {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in backend/.env');
  }

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters');
  }

  await connectDB();

  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error(`No admin account exists for ${email}. Start the backend once to create it.`);
  }

  admin.passwordHash = await Admin.hashPassword(password);
  await admin.save();

  console.log(`[admin] password updated for ${email}`);
}

resetAdminPassword()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[admin] password reset failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
