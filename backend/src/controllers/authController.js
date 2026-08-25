const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

function signToken(admin) {
  return jwt.sign({ sub: admin._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signToken(admin);
  const cookieName = process.env.COOKIE_NAME || 'rt_email_admin_token';
  res.cookie(cookieName, token, cookieOptions());

  res.json({ admin: admin.toJSON(), token });
}

async function logout(req, res) {
  const cookieName = process.env.COOKIE_NAME || 'rt_email_admin_token';
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(cookieName, clearOptions);
  res.json({ message: 'Logged out.' });
}

async function me(req, res) {
  res.json({ admin: req.admin.toJSON() });
}

module.exports = { login, logout, me };
