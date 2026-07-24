const crypto = require('crypto');
const dayjs = require('dayjs');
const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');
const loginHistoryRepository = require('../repositories/loginHistory.repository');
const otpRepository = require('../repositories/otp.repository');
const passwordResetTokenRepository = require('../repositories/passwordResetToken.repository');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const mailService = require('./mail.service');
const { signAccessToken, signRefreshToken, hashToken, refreshExpiryDate } = require('./token.service');
const { OTP_PURPOSE, USER_STATUS } = require('../constants/enums');

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;

async function issueTokenPair(user, { deviceId, deviceInfo, ip } = {}) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken();

  const record = await refreshTokenRepository.create({
    userId: user._id,
    deviceId,
    tokenHash: hashToken(refreshToken),
    deviceInfo,
    ip,
    expiresAt: refreshExpiryDate(),
  });

  // Refresh token returned to the client is `${record._id}.${rawToken}` so
  // rotation/revocation can look the session up by id without scanning hashes.
  return { accessToken, refreshToken: `${record._id}.${refreshToken}` };
}

async function login({ email, password, deviceId, deviceInfo, ip, userAgent }) {
  const user = await userRepository.findByEmail(email, { includePassword: true });

  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      await loginHistoryRepository.record({ userId: user._id, ip, userAgent, success: false, failureReason: 'invalid_credentials' });
    }
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    await loginHistoryRepository.record({ userId: user._id, ip, userAgent, success: false, failureReason: 'account_not_active' });
    throw ApiError.forbidden('Account is not active');
  }

  const tokens = await issueTokenPair(user, { deviceId, deviceInfo, ip });

  user.lastLoginAt = new Date();
  await user.save();

  await loginHistoryRepository.record({ userId: user._id, ip, userAgent, success: true });
  await auditLogService.record({ userId: user._id, action: 'login', module: 'auth', entityType: 'User', entityId: user._id, ip });

  return { user, ...tokens };
}

async function refresh({ refreshToken, deviceId, deviceInfo, ip }) {
  const [tokenId, rawToken] = String(refreshToken).split('.');
  if (!tokenId || !rawToken) throw ApiError.unauthorized('Malformed refresh token');

  const record = await refreshTokenRepository.findActiveById(tokenId);
  if (!record || record.tokenHash !== hashToken(rawToken)) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userRepository.findById(record.userId);
  if (!user || user.isDeleted || user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.unauthorized('User no longer active');
  }

  // Rotation: revoke the presented token and issue a brand-new pair, chained via replacedByTokenId.
  const newTokens = await issueTokenPair(user, { deviceId, deviceInfo, ip });
  const [newTokenId] = newTokens.refreshToken.split('.');
  await refreshTokenRepository.revoke(record._id, newTokenId);

  return newTokens;
}

async function logout({ refreshToken }) {
  const [tokenId] = String(refreshToken).split('.');
  if (tokenId) await refreshTokenRepository.revoke(tokenId);
}

async function listSessions(userId) {
  return refreshTokenRepository.findActiveSessionsForUser(userId);
}

async function revokeSession(userId, sessionId) {
  const session = await refreshTokenRepository.findActiveById(sessionId);
  if (!session || session.userId.toString() !== userId.toString()) {
    throw ApiError.notFound('Session not found');
  }
  await refreshTokenRepository.revoke(sessionId);
}

function generateOtpCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

async function requestOtp({ identifier, purpose }) {
  const code = generateOtpCode();
  await otpRepository.create({
    identifier,
    codeHash: hashToken(code),
    purpose,
    expiresAt: dayjs().add(OTP_EXPIRY_MINUTES, 'minute').toDate(),
  });

  if (purpose === OTP_PURPOSE.LOGIN || purpose === OTP_PURPOSE.EMAIL_VERIFY) {
    await mailService.sendOtpEmail(identifier, code);
  }
  // SMS channel intentionally not wired here yet — no SMS provider has been
  // chosen; see docs/architecture note when one is selected.
}

async function verifyOtp({ identifier, purpose, code }) {
  const otp = await otpRepository.findLatestActive(identifier, purpose);
  if (!otp) throw ApiError.badRequest('No active OTP found for this request');

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.forbidden('Too many incorrect attempts — request a new OTP');
  }

  if (otp.codeHash !== hashToken(code)) {
    await otpRepository.incrementAttempts(otp._id);
    throw ApiError.badRequest('Incorrect OTP');
  }

  await otpRepository.markConsumed(otp._id);
  return true;
}

async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) return; // Do not reveal whether the email exists.

  const rawToken = crypto.randomBytes(32).toString('hex');
  const record = await passwordResetTokenRepository.create({
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt: dayjs().add(PASSWORD_RESET_EXPIRY_MINUTES, 'minute').toDate(),
  });

  await mailService.sendPasswordResetEmail(user.email, `${record._id}.${rawToken}`);
}

async function resetPassword({ token, newPassword }) {
  const [tokenId, rawToken] = String(token).split('.');
  if (!tokenId || !rawToken) throw ApiError.badRequest('Malformed reset token');

  const record = await passwordResetTokenRepository.findActiveById(tokenId);
  if (!record || record.tokenHash !== hashToken(rawToken)) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const user = await userRepository.findById(record.userId);
  if (!user) throw ApiError.notFound('User not found');

  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  await passwordResetTokenRepository.markUsed(record._id);
  await refreshTokenRepository.revokeAllForUser(user._id);
  await auditLogService.record({ userId: user._id, action: 'update', module: 'auth', entityType: 'User', entityId: user._id, after: { passwordReset: true } });
}

// Authenticated change-password (knows the current password) — distinct from
// forgot/reset (a token via email, no need to know the old password).
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  user.mustChangePassword = false;
  await user.save();

  // Other sessions (other devices) are revoked since the password changed;
  // the session making this request keeps working until its access token expires.
  await refreshTokenRepository.revokeAllForUser(user._id);
  await auditLogService.record({ userId: user._id, action: 'update', module: 'auth', entityType: 'User', entityId: user._id, after: { passwordChanged: true } });
}

module.exports = {
  login,
  refresh,
  logout,
  listSessions,
  revokeSession,
  requestOtp,
  verifyOtp,
  forgotPassword,
  resetPassword,
  changePassword,
};
