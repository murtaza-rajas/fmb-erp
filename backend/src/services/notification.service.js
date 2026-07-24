const notificationRepository = require('../repositories/notification.repository');
const pushNotificationService = require('./pushNotification.service');
const { emitToUser } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { NOTIFICATION_CHANNEL } = require('../constants/enums');
const logger = require('../utils/logger');

// The one fan-out point for real-time alerts: always records an in-app
// notification, always emits over Socket.io (harmless no-op if the user
// isn't connected), and always attempts FCM push (covers mobile apps that
// are backgrounded/closed, which Socket.io cannot reach) — see
// docs/architecture/api-design.md § Notifications.
async function dispatch({ userId, type, title, message, link }) {
  const notification = await notificationRepository.create({
    userId,
    type,
    title,
    message,
    link,
    channel: NOTIFICATION_CHANNEL.IN_APP,
  });

  emitToUser(userId, 'notification:new', {
    id: notification._id,
    type,
    title,
    message,
    link,
    createdAt: notification.createdAt,
  });

  try {
    const pushDeliveryStatus = await pushNotificationService.sendToUser(userId, { title, message, link });
    await notificationRepository.updateById(notification._id, { pushDeliveryStatus });
  } catch (err) {
    logger.error('Push notification dispatch failed', { error: err.message, userId, type });
  }

  return notification;
}

function listForUser(userId, { page, limit, unreadOnly }) {
  return notificationRepository.findForUser(userId, { page, limit, unreadOnly });
}

async function markRead(id, userId) {
  const notification = await notificationRepository.findById(id);
  if (!notification || notification.userId.toString() !== userId.toString()) {
    throw ApiError.notFound('Notification not found');
  }
  return notificationRepository.updateById(id, { isRead: true });
}

function markAllRead(userId) {
  return notificationRepository.markAllRead(userId);
}

module.exports = { dispatch, listForUser, markRead, markAllRead };
