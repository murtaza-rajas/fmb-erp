const Redis = require('ioredis');
const { redisUrl } = require('./env');
const logger = require('../utils/logger');

let client;

function getRedisClient() {
  if (!client) {
    client = new Redis(redisUrl, {
      // Fail fast rather than hang: with the default offline queue, commands
      // issued while disconnected never resolve or reject — they just sit
      // queued waiting for a connection that may never come back. Callers
      // (e.g. dashboard.service.js) rely on a rejected promise to fall back
      // to computing fresh data, so that must actually happen quickly.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: false,
    });

    // The reconnect loop above runs forever by design (so the app picks
    // Redis back up automatically once it's available) — but that means an
    // unreachable Redis logs an error every ~2s indefinitely. Log only the
    // first failure of each outage, then reset once 'connect' fires again.
    let hasLoggedError = false;
    client.on('connect', () => {
      logger.info('Redis connected');
      hasLoggedError = false;
    });
    client.on('error', (err) => {
      if (hasLoggedError) return;
      logger.error('Redis connection error', { error: err.message });
      hasLoggedError = true;
    });
  }
  return client;
}

module.exports = { getRedisClient };
