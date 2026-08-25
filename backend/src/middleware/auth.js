const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'rt_email_admin_token';
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

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

module.exports = { requireAuth };
