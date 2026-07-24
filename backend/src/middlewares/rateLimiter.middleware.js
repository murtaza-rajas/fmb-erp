const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitConfig } = require('../config/env');
const ApiResponse = require('../utils/ApiResponse');

const tooManyRequestsHandler = (req, res) =>
  ApiResponse.error(res, {
    statusCode: 429,
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
  });

const globalRateLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});

const authRateLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequestsHandler,
});

module.exports = { globalRateLimiter, authRateLimiter };
