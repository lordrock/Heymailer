const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Subscription = require('../models/Subscription');

async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'heymailer_token';
    const token =
      req.cookies?.[cookieName] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.sub);

    if (!admin) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if ((payload.ver || 0) !== (admin.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
    }

    if (admin.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super admin access is required.' });
  }
  next();
}

async function requireActiveSubscription(req, res, next) {
  if (req.admin?.role === 'superadmin') return next();
  const subscription = await Subscription.findOne({ userId: req.admin._id, status: 'active', endsAt: { $gt: new Date() } });
  if (!subscription) {
    return res.status(402).json({ message: 'An active subscription is required to use workspace features.', code: 'SUBSCRIPTION_REQUIRED' });
  }
  req.subscription = subscription;
  next();
}

module.exports = { requireAuth, requireSuperAdmin, requireActiveSubscription };
