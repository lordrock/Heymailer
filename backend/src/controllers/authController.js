const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const AuthToken = require('../models/AuthToken');
const Workspace = require('../models/Workspace');
const Settings = require('../models/Settings');
const EmailTemplate = require('../models/EmailTemplate');
const ContactGroup = require('../models/ContactGroup');
const Subscription = require('../models/Subscription');
const { assertPlatformMailReady, sendPlatformEmail } = require('../services/platformEmail');
const { getPrimaryFrontendUrl } = require('../config/frontendUrl');
const { renderAuthEmail } = require('../templates/authEmail');

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
  const url = new URL(path, `${getPrimaryFrontendUrl()}/`);
  url.searchParams.set('token', token);
  return url.toString();
}

async function sendVerificationEmail(admin) {
  const token = await createSingleUseToken(admin._id, 'verify_email', 24 * 60);
  const url = clientUrl('/auth/verify-email', token);
  await sendPlatformEmail({
    to: admin.email,
    subject: 'Verify your HeyMailer email',
    text: `Welcome to HeyMailer. Verify your email within 24 hours: ${url}`,
    html: renderAuthEmail({
      eyebrow: 'Workspace verification',
      title: 'Confirm your email address',
      greeting: `Welcome to HeyMailer, ${admin.name}.`,
      body: 'Verify your email to activate secure access to your workspace and campaigns.',
      buttonLabel: 'Verify my email',
      url,
      expiry: 'This verification link expires in 24 hours.',
      securityNote: 'If you did not create a HeyMailer account, you can safely ignore this email.',
    }),
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
  assertPlatformMailReady();
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email, role: 'customer' });
  if (admin && !admin.emailVerified) {
    try { await sendVerificationEmail(admin); } catch (err) { console.error('[auth] verification resend failed:', err.message); }
  }
  res.json({ message: 'If an unverified account exists, a new verification link has been sent.' });
}

async function requestMagicLink(req, res) {
  assertPlatformMailReady();
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email });
  if (admin) {
    const token = await createSingleUseToken(admin._id, 'magic_login', 15);
    const url = clientUrl('/auth/magic-link', token);
    try {
      await sendPlatformEmail({
        to: admin.email,
        subject: 'Your HeyMailer sign-in link',
        text: `Sign in to HeyMailer within 15 minutes: ${url}`,
        html: renderAuthEmail({
          eyebrow: 'Passwordless sign-in',
          title: 'Your secure sign-in link',
          greeting: `Hello ${admin.name},`,
          body: 'Use the button below to sign in to your HeyMailer workspace without a password.',
          buttonLabel: 'Sign in to HeyMailer',
          url,
          expiry: 'This single-use link expires in 15 minutes.',
          securityNote: 'If you did not request this link, ignore this email. Your account remains secure.',
        }),
      });
    } catch (err) { console.error('[auth] magic link failed:', err.message); }
  }
  res.json({ message: 'If the account exists, a sign-in link has been sent.' });
}

async function consumeMagicLink(req, res) {
  const record = await consumeSingleUseToken(req.body.token, 'magic_login');
  if (!record) return res.status(400).json({ message: 'This sign-in link is invalid or has expired.' });
  const admin = await Admin.findById(record.userId);
  if (!admin) return res.status(403).json({ message: 'This account is unavailable.' });
  if (!admin.emailVerified) { admin.emailVerified = true; admin.emailVerifiedAt = new Date(); }
  admin.lastLoginAt = new Date();
  await admin.save();
  const token = signToken(admin);
  res.cookie(process.env.COOKIE_NAME || 'heymailer_token', token, cookieOptions());
  res.json({ admin: admin.toJSON(), token });
}

async function forgotPassword(req, res) {
  assertPlatformMailReady();
  const email = String(req.body.email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email });
  if (admin) {
    const token = await createSingleUseToken(admin._id, 'reset_password', 30);
    const url = clientUrl('/auth/reset-password', token);
    try {
      await sendPlatformEmail({
        to: admin.email,
        subject: 'Reset your HeyMailer password',
        text: `Reset your password within 30 minutes: ${url}`,
        html: renderAuthEmail({
          eyebrow: 'Account recovery',
          title: 'Choose a new password',
          greeting: `Hello ${admin.name},`,
          body: 'We received a request to reset the password for your HeyMailer account.',
          buttonLabel: 'Reset my password',
          url,
          expiry: 'This password-reset link expires in 30 minutes.',
          securityNote: 'If you did not request a password reset, ignore this email and keep using your current password.',
        }),
      });
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
  if (req.admin.role === 'superadmin') {
    return res.json({ admin: req.admin.toJSON(), access: { state: 'active', workspaceStatus: null, subscriptionStatus: null } });
  }
  const [workspace, subscription] = await Promise.all([
    Workspace.findById(req.admin.workspaceId).select('status hasRequestedDomain requestedDomain').lean(),
    Subscription.findOne({ userId: req.admin._id }).select('status endsAt').lean(),
  ]);
  const subscriptionActive = subscription?.status === 'active' && subscription.endsAt > new Date();
  const suspended = req.admin.status === 'suspended' || workspace?.status === 'suspended';
  res.json({
    admin: req.admin.toJSON(),
    access: {
      state: suspended ? 'suspended' : subscriptionActive ? 'active' : 'payment_required',
      workspaceStatus: workspace?.status || 'missing',
      subscriptionStatus: subscriptionActive ? 'active' : subscription?.status || 'none',
      subscriptionEndsAt: subscription?.endsAt || null,
      requestedDomain: workspace?.requestedDomain || '',
    },
  });
}

module.exports = { signup, login, logout, me, verifyEmail, resendVerification, requestMagicLink, consumeMagicLink, forgotPassword, resetPassword };
