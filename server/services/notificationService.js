const Notification = require('../models/Notification');
const { logger } = require('../config/logger');

/**
 * Persistently create in-app notification
 */
async function createNotification({ userId, type, title, message, sourceType, sourceId, priority = 'normal' }) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      sourceType,
      sourceId,
      priority,
    });
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error: error.message, userId, type });
    return null;
  }
}

/**
 * Bulk notify multiple users
 */
async function notifyUsers(userIds, { type, title, message, sourceType, sourceId, priority = 'normal' }) {
  try {
    const notifications = userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      sourceType,
      sourceId,
      priority,
    }));
    return await Notification.insertMany(notifications);
  } catch (error) {
    logger.error('Failed to bulk create notifications', { error: error.message });
    return [];
  }
}

module.exports = {
  createNotification,
  notifyUsers,
};
