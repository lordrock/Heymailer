const crypto = require('crypto');

// Generates a short signed token so unsubscribe links can't be forged to
// unsubscribe someone else's address. No DB lookup needed to verify.
function signToken(email, workspaceId) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  return crypto.createHmac('sha256', secret).update(`${workspaceId}:${email.toLowerCase().trim()}`).digest('hex').slice(0, 32);
}

function verifyToken(email, workspaceId, token) {
  if (!email || !workspaceId || !token) return false;
  const expected = signToken(email, workspaceId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

function buildUnsubscribeUrl(baseUrl, email, workspaceId, customEndpoint = '') {
  const token = signToken(email, workspaceId);
  const url = customEndpoint ? new URL(customEndpoint) : new URL('/api/public/unsubscribe', baseUrl);
  url.searchParams.set('email', email);
  url.searchParams.set('workspace', String(workspaceId));
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = { signToken, verifyToken, buildUnsubscribeUrl };
