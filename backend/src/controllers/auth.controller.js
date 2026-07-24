const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/auth.service');

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.roleId?.name,
  permissions: (user.roleId?.permissions || []).map((p) => p.key),
  staffType: user.staffType,
  status: user.status,
});

const login = asyncHandler(async (req, res) => {
  const { email, password, deviceId } = req.body;
  const { user, accessToken, refreshToken } = await authService.login({
    email,
    password,
    deviceId,
    deviceInfo: req.headers['user-agent'],
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  ApiResponse.send(res, { data: { user: sanitizeUser(user), accessToken, refreshToken } });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken, deviceId } = req.body;
  const tokens = await authService.refresh({
    refreshToken,
    deviceId,
    deviceInfo: req.headers['user-agent'],
    ip: req.ip,
  });
  ApiResponse.send(res, { data: tokens });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({ refreshToken: req.body.refreshToken });
  ApiResponse.send(res, { data: { loggedOut: true } });
});

const me = asyncHandler(async (req, res) => {
  ApiResponse.send(res, { data: sanitizeUser(req.user) });
});

const sessions = asyncHandler(async (req, res) => {
  const list = await authService.listSessions(req.user._id);
  ApiResponse.send(res, { data: list });
});

const revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSession(req.user._id, req.params.id);
  ApiResponse.send(res, { data: { revoked: true } });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  ApiResponse.send(res, { data: { message: 'If that email exists, a reset link has been sent' } });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ApiResponse.send(res, { data: { message: 'Password has been reset' } });
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  ApiResponse.send(res, { data: { message: 'Password has been changed' } });
});

const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestOtp(req.body);
  ApiResponse.send(res, { data: { message: 'OTP sent' } });
});

const resendOtp = requestOtp;

const verifyOtpHandler = asyncHandler(async (req, res) => {
  await authService.verifyOtp(req.body);
  ApiResponse.send(res, { data: { verified: true } });
});

module.exports = {
  login,
  refresh,
  logout,
  me,
  sessions,
  revokeSession,
  forgotPassword,
  resetPassword,
  changePassword,
  requestOtp,
  resendOtp,
  verifyOtp: verifyOtpHandler,
};
