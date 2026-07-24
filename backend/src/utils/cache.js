const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TIMEOUT_MS = 300;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis operation timed out')), ms)),
  ]);
}

// Every caller must be able to treat the cache as optional — Redis being
// down or slow must never block the request, only skip the cache. ioredis's
// own retry/queue configuration proved unreliable at preventing hangs in
// practice, so this enforces a hard deadline independent of that.
async function safeGet(key) {
  try {
    return await withTimeout(getRedisClient().get(key), CACHE_TIMEOUT_MS);
  } catch (err) {
    logger.warn('Cache read skipped', { key, error: err.message });
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  try {
    await withTimeout(getRedisClient().set(key, value, 'EX', ttlSeconds), CACHE_TIMEOUT_MS);
  } catch (err) {
    logger.warn('Cache write skipped', { key, error: err.message });
  }
}

module.exports = { safeGet, safeSet };
