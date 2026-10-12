const { createClient } = require('redis');

let client;

function redisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function getRedisClient() {
  if (!redisConfigured()) return null;
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (error) => console.error('[redis]', error.message));
  }
  return client;
}

async function connectRedis() {
  const redis = getRedisClient();
  if (redis && !redis.isOpen) await redis.connect();
  return redis;
}

async function closeRedis() {
  if (client?.isOpen) await client.quit();
}

module.exports = { redisConfigured, getRedisClient, connectRedis, closeRedis };
