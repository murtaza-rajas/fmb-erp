const deviceTokenRepository = require('../repositories/deviceToken.repository');

function registerDevice(userId, { deviceId, fcmToken, platform }) {
  return deviceTokenRepository.upsert({ userId, deviceId, fcmToken, platform });
}

function deregisterDevice(userId, deviceId) {
  return deviceTokenRepository.deactivate(userId, deviceId);
}

module.exports = { registerDevice, deregisterDevice };
