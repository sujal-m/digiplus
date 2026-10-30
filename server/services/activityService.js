const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../config/logger');

/**
 * Log persistent user/system activity
 */
async function logActivity({ userId, action, entityType, entityId, details = {}, correlationId }) {
  try {
    const activity = await ActivityLog.create({
      userId,
      action,
      entityType,
      entityId,
      details,
      correlationId,
    });
    return activity;
  } catch (error) {
    logger.error('Failed to log activity record', { error: error.message, action, entityType });
    return null;
  }
}

module.exports = {
  logActivity,
};
