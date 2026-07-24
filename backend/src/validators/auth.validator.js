const { body } = require('express-validator');

const login = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('deviceId').optional({ values: 'falsy' }).isString(),
];

const refreshToken = [body('refreshToken').notEmpty().withMessage('refreshToken is required')];

const forgotPassword = [body('email').isEmail().withMessage('Valid email required').normalizeEmail()];

const resetPassword = [
  body('token').notEmpty().withMessage('token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const changePassword = [
  body('currentPassword').notEmpty().withMessage('currentPassword is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const requestOtp = [
  body('identifier').notEmpty().withMessage('identifier is required'),
  body('purpose').isIn(['login', 'password_reset', 'email_verify']).withMessage('Invalid purpose'),
];

const verifyOtp = [
  body('identifier').notEmpty().withMessage('identifier is required'),
  body('purpose').isIn(['login', 'password_reset', 'email_verify']).withMessage('Invalid purpose'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

module.exports = { login, refreshToken, forgotPassword, resetPassword, changePassword, requestOtp, verifyOtp };
