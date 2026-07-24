const BaseRepository = require('./base.repository');
const Notification = require('../models/Notification.model');

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  findForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const filter = { userId };
    if (unreadOnly) filter.isRead = false;
    return Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  markAllRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }
}

module.exports = new NotificationRepository();
