const DeviceToken = require('../models/DeviceToken.model');

class DeviceTokenRepository {
  upsert({ userId, deviceId, fcmToken, platform }) {
    return DeviceToken.findOneAndUpdate(
      { userId, deviceId },
      { fcmToken, platform, isActive: true, lastUsedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  deactivate(userId, deviceId) {
    return DeviceToken.findOneAndUpdate({ userId, deviceId }, { isActive: false });
  }

  findActiveTokensForUser(userId) {
    return DeviceToken.find({ userId, isActive: true });
  }

  markTokenInvalid(fcmToken) {
    return DeviceToken.updateMany({ fcmToken }, { isActive: false });
  }
}

module.exports = new DeviceTokenRepository();
