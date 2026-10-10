const buckets = new Map();

function authRateLimit({ windowMs = 15 * 60 * 1000, max = 5, key = (req) => req.ip || req.socket?.remoteAddress || 'unknown' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = String(key(req)).toLowerCase();
    const existing = buckets.get(bucketKey);
    const bucket = !existing || now - existing.startedAt >= windowMs
      ? { startedAt: now, count: 0 }
      : existing;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count));
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.startedAt + windowMs - now) / 1000));
      return res.status(429).json({ message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
    }
    return next();
  };
}

module.exports = { authRateLimit };
