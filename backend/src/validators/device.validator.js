const { body, param } = require('express-validator');
const { DEVICE_PLATFORM } = require('../constants/enums');

const register = [
  body('deviceId').notEmpty().withMessage('deviceId is required'),
  body('fcmToken').notEmpty().withMessage('fcmToken is required'),
  body('platform').isIn(Object.values(DEVICE_PLATFORM)).withMessage('Invalid platform'),
];

const deregister = [param('deviceId').notEmpty()];

module.exports = { register, deregister };
