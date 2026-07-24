const { initFirebase } = require('../config/firebase');
const deviceTokenRepository = require('../repositories/deviceToken.repository');
const logger = require('../utils/logger');

// Sends to every active device for a user via FCM — covers backgrounded/
// closed mobile apps that Socket.io cannot reach. No-ops quietly (logged
// once) when Firebase credentials aren't configured, same fallback pattern
// as mail.service.js for SMTP.
async function sendToUser(userId, { title, message, link }) {
  const admin = initFirebase();
  if (!admin) return 'skipped';

  const tokens = await deviceTokenRepository.findActiveTokensForUser(userId);
  if (tokens.length === 0) return 'skipped';

  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((t) => t.fcmToken),
    notification: { title, body: message },
    data: link ? { link } : undefined,
  });

  response.responses.forEach((res, i) => {
    if (!res.success && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(res.error?.code)) {
      deviceTokenRepository.markTokenInvalid(tokens[i].fcmToken).catch((err) => logger.error('Failed to mark device token invalid', { error: err.message }));
    }
  });

  return response.successCount > 0 ? 'sent' : 'failed';
}

module.exports = { sendToUser };
