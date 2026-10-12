const buckets = new Map();
const { getRedisClient } = require('../config/redis');
let requestCount = 0;

function pruneExpiredBuckets(now, windowMs) {
  for (const [bucketKey, bucket] of buckets) {
    if (now - bucket.startedAt >= windowMs) buckets.delete(bucketKey);
  }
}

function authRateLimit({ windowMs = 15 * 60 * 1000, max = 5, key = (req) => req.ip || req.socket?.remoteAddress || 'unknown' } = {}) {
  return async (req, res, next) => {
    const now = Date.now();
    requestCount += 1;
    if (requestCount % 100 === 0 || buckets.size > 10000) pruneExpiredBuckets(now, windowMs);
    const bucketKey = String(key(req)).toLowerCase();
    const redis = getRedisClient();
    if (redis?.isReady) {
      try {
        const redisKey = `heymailer:rate:auth:${bucketKey}:${Math.floor(now / windowMs)}`;
        const count = await redis.incr(redisKey);
        if (count === 1) await redis.pExpire(redisKey, windowMs);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
        if (count > max) {
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
          return res.status(429).json({ message: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
        }
        return next();
      } catch (error) {
        console.error('[rate-limit] Redis unavailable; using process-local fallback:', error.message);
      }
    }
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
