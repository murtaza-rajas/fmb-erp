const cron = require('node-cron');
const dayjs = require('dayjs');
const RefreshToken = require('../models/RefreshToken.model');
const logger = require('../utils/logger');

const REVOKED_RETENTION_DAYS = 30;

// The expiresAt TTL index only purges tokens once they naturally expire —
// a token revoked early (logout, password reset) sits around until then.
// This sweeps those out daily so the collection doesn't accumulate dead rows.
function scheduleTokenCleanupJob() {
  cron.schedule('30 2 * * *', async () => {
    try {
      const cutoff = dayjs().subtract(REVOKED_RETENTION_DAYS, 'day').toDate();
      const result = await RefreshToken.deleteMany({ revokedAt: { $ne: null, $lt: cutoff } });
      if (result.deletedCount > 0) {
        logger.info(`Token cleanup job removed ${result.deletedCount} revoked refresh tokens`);
      }
    } catch (err) {
      logger.error('Token cleanup job failed', { error: err.message });
    }
  });
}

module.exports = { scheduleTokenCleanupJob };
