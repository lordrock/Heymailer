const crypto = require('crypto');

// Generates a short signed token so unsubscribe links can't be forged to
// unsubscribe someone else's address. No DB lookup needed to verify.
function signToken(email) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  return crypto.createHmac('sha256', secret).update(email.toLowerCase().trim()).digest('hex').slice(0, 32);
}

function verifyToken(email, token) {
  if (!email || !token) return false;
  const expected = signToken(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

function buildUnsubscribeUrl(baseUrl, email) {
  const token = signToken(email);
  const url = new URL('/api/public/unsubscribe', baseUrl);
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = { signToken, verifyToken, buildUnsubscribeUrl };
