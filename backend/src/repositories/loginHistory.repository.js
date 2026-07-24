const LoginHistory = require('../models/LoginHistory.model');

class LoginHistoryRepository {
  record({ userId, ip, userAgent, success, failureReason }) {
    return LoginHistory.create({ userId, ip, userAgent, success, failureReason });
  }

  findForUser(userId, { limit = 20 } = {}) {
    return LoginHistory.find({ userId }).sort({ timestamp: -1 }).limit(limit);
  }
}

module.exports = new LoginHistoryRepository();
