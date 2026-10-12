const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  const health = { status: 'ok', service: 'heymailer-api', timestamp: new Date().toISOString() };
  try {
    const mongoose = require('mongoose');
    health.database = mongoose.connection.readyState === 1 ? 'up' : 'down';
    if (health.database !== 'up') return res.status(503).json({ ...health, status: 'degraded' });
  } catch (_) {
    health.database = 'unknown';
  }
  try {
    const { getRedisClient, redisConfigured } = require('../config/redis');
    const redis = getRedisClient();
    health.redis = !redisConfigured() ? 'not_configured' : redis?.isReady ? 'up' : 'down';
    if (process.env.NODE_ENV === 'production' && health.redis !== 'up') {
      return res.status(503).json({ ...health, status: 'degraded' });
    }
  } catch (_) {
    health.redis = 'unknown';
  }
  return res.status(200).json(health);
});

module.exports = router;
