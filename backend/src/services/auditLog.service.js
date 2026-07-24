const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

// Fire-and-forget by design: an audit-write failure must never break the
// business operation that triggered it, but it is logged loudly so it's
// never silently lost.
async function record({ userId, action, module: moduleName, entityType, entityId, before, after, ip }) {
  try {
    await AuditLog.create({ userId, action, module: moduleName, entityType, entityId, before, after, ip });
  } catch (err) {
    logger.error('Failed to write audit log', { error: err.message, action, module: moduleName, entityId });
  }
}

module.exports = { record };
