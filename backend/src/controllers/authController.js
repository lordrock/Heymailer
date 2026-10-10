const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const AuthToken = require('../models/AuthToken');
const Workspace = require('../models/Workspace');
const Settings = require('../models/Settings');
const EmailTemplate = require('../models/EmailTemplate');
const ContactGroup = require('../models/ContactGroup');
const { sendPlatformEmail } = require('../services/platformEmail');

function signToken(admin) {
  return jwt.sign({ sub: admin._id.toString(), role: admin.role, ver: admin.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSingleUseToken(userId, purpose, ttlMinutes) {
  await AuthToken.deleteMany({ userId, purpose, usedAt: null });
  const rawToken = crypto.randomBytes(32).toString('hex');
  await AuthToken.create({ userId, purpose, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000) });
  return rawToken;
}

async function consumeSingleUseToken(rawToken, purpose) {
  if (!rawToken) return null;
  return AuthToken.findOneAndUpdate(
    { tokenHash: hashToken(String(rawToken)), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
}

function clientUrl(path, token) {
  const base = (process.env.CLIENT_URL || 'http://localhost:3100').split(',')[0].replace(/\/$/, '');
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(admin) {
  const token = await createSingleUseToken(admin._id, 'verify_email', 24 * 60);
  const url = clientUrl('/auth/verify-email', token);
  await sendPlatformEmail({
    to: admin.email,
    subject: 'Verify your HeyMailer email',
    text: `Welcome to HeyMailer. Verify your email within 24 hours: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14241c"><h1 style="font-size:24px">Verify your email</h1><p>Welcome to HeyMailer, ${admin.name}. Confirm your email to secure your workspace.</p><p><a href="${url}" style="display:inline-block;background:#0b7a53;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Verify email</a></p><p style="font-size:12px;color:#637069">This link expires in 24 hours.</p></div>`,
  });
}

function cookieOptions() {
  const configuredSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: configuredSameSite || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const match = await admin.comparePassword(password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  if (admin.role !== 'superadmin' && admin.emailVerified === false) {
    return res.status(403).json({ message: 'Verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' });
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(admin);
  const cookieName = process.env.COOKIE_NAME || 'heymailer_token';
  res.cookie(cookieName, token, cookieOptions());

  res.json({ admin: admin.toJSON(), token });
}

async function signup(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const workspaceName = String(req.body.workspaceName || '').trim() || `${name}'s workspace`;

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ message: 'Name, a valid email, and a password of at least 8 characters are required.' });
  }
  if (await Admin.exists({ email })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const admin = await Admin.create({
    name,
    email,
    passwordHash: await Admin.hashPassword(password),
    workspaceName,
    role: 'customer',
  });
  const slugBase = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'workspace';
  const workspace = await Workspace.create({ name: workspaceName, slug: `${slugBase}-${admin._id.toString().slice(-6)}`, ownerId: admin._id });
  admin.workspaceId = workspace._id;
  await admin.save();
  await Settings.create({ workspaceId: workspace._id, singleton: 'main', senderName: workspaceName });
  await Promise.all([
    ContactGroup.create({ workspaceId: workspace._id, name: 'All subscribers', description: 'Permission-based email subscribers' }),
    EmailTemplate.create({ workspaceId: workspace._id, name: 'Simple announcement', category: 'Announcement', subject: 'An update from {{senderName}}', preheader: 'The latest news from our team.', htmlContent: '<h1>Hello {{firstName}},</h1><p>Share your update here.</p>', textContent: 'Hello {{firstName}},\n\nShare your update here.', description: 'A clean starting point for workspace announcements.', isSystem: true }),
  ]);
  let emailSent = true;
  try {
    await sendVerificationEmail(admin);
  } catch (err) {
    emailSent = false;
    console.error('[auth] verification email failed:', err.message);
  }
  res.status(201).json({ verificationRequired: true, emailSent, email: admin.email });
}

async function verifyEmail(req, res) {
  const record = await consumeSingleUseToken(req.body.token, 'verify_email');
  if (!record) return res.status(400).json({ message: 'This verification link is invalid or has expired.' });
  const admin = await Admin.findById(record.userId);
  if (!admin) return res.status(400).json({ message: 'Account not found.' });
  admin.emailVerified = true;
  admin.emailVerifiedAt = new Date();
  await admin.save();
  const token = signToken(admin);
  res.cookie(process.env.COOKIE_NAME || 'heymailer_token', token, cookieOptions());
  res.json({ admin: admin.toJSON(), token, message: 'Email verified successfully.' });
}

async function resendVerification(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email, role: 'customer' });
  if (admin && !admin.emailVerified) {
    try { await sendVerificationEmail(admin); } catch (err) { console.error('[auth] verification resend failed:', err.message); }
  }
  res.json({ message: 'If an unverified account exists, a new verification link has been sent.' });
}

async function requestMagicLink(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email, status: 'active' });
  if (admin) {
    const token = await createSingleUseToken(admin._id, 'magic_login', 15);
    const url = clientUrl('/auth/magic-link', token);
    try {
      await sendPlatformEmail({ to: admin.email, subject: 'Your HeyMailer sign-in link', text: `Sign in to HeyMailer within 15 minutes: ${url}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14241c"><h1 style="font-size:24px">Sign in to HeyMailer</h1><p>Use this secure, single-use link to access your workspace.</p><p><a href="${url}" style="display:inline-block;background:#0b7a53;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Sign in securely</a></p><p style="font-size:12px;color:#637069">This link expires in 15 minutes. Ignore it if you did not request it.</p></div>` });
    } catch (err) { console.error('[auth] magic link failed:', err.message); }
  }
  res.json({ message: 'If the account exists, a sign-in link has been sent.' });
}

async function consumeMagicLink(req, res) {
  const record = await consumeSingleUseToken(req.body.token, 'magic_login');
  if (!record) return res.status(400).json({ message: 'This sign-in link is invalid or has expired.' });
  const admin = await Admin.findById(record.userId);
  if (!admin || admin.status !== 'active') return res.status(403).json({ message: 'This account is unavailable.' });
  if (!admin.emailVerified) { admin.emailVerified = true; admin.emailVerifiedAt = new Date(); }
  admin.lastLoginAt = new Date();
  await admin.save();
  const token = signToken(admin);
  res.cookie(process.env.COOKIE_NAME || 'heymailer_token', token, cookieOptions());
  res.json({ admin: admin.toJSON(), token });
}

async function forgotPassword(req, res) {
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email, status: 'active' });
  if (admin) {
    const token = await createSingleUseToken(admin._id, 'reset_password', 30);
    const url = clientUrl('/auth/reset-password', token);
    try {
      await sendPlatformEmail({ to: admin.email, subject: 'Reset your HeyMailer password', text: `Reset your password within 30 minutes: ${url}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#14241c"><h1 style="font-size:24px">Reset your password</h1><p>We received a password reset request for your HeyMailer account.</p><p><a href="${url}" style="display:inline-block;background:#0b7a53;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Choose a new password</a></p><p style="font-size:12px;color:#637069">This link expires in 30 minutes.</p></div>` });
    } catch (err) { console.error('[auth] password reset email failed:', err.message); }
  }
  res.json({ message: 'If the account exists, password-reset instructions have been sent.' });
}

async function resetPassword(req, res) {
  const password = String(req.body.password || '');
  if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must contain 8–128 characters.' });
  const record = await consumeSingleUseToken(req.body.token, 'reset_password');
  if (!record) return res.status(400).json({ message: 'This password-reset link is invalid or has expired.' });
  const admin = await Admin.findById(record.userId);
  if (!admin) return res.status(400).json({ message: 'Account not found.' });
  admin.passwordHash = await Admin.hashPassword(password);
  admin.tokenVersion = (admin.tokenVersion || 0) + 1;
  await admin.save();
  await AuthToken.deleteMany({ userId: admin._id, usedAt: null });
  res.json({ message: 'Password updated. You can now sign in.' });
}

async function logout(req, res) {
  const cookieName = process.env.COOKIE_NAME || 'heymailer_token';
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(cookieName, clearOptions);
  res.json({ message: 'Logged out.' });
}

async function me(req, res) {
  res.json({ admin: req.admin.toJSON() });
}

module.exports = { signup, login, logout, me, verifyEmail, resendVerification, requestMagicLink, consumeMagicLink, forgotPassword, resetPassword };
