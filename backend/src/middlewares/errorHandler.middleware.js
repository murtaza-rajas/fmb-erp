const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const { isProduction } = require('../config/env');

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, stack: err.stack, path: req.originalUrl });
    }
    return ApiResponse.error(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }

  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, {
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  if (err.code === 11000) {
    return ApiResponse.error(res, {
      statusCode: 409,
      code: 'DUPLICATE_KEY',
      message: 'A record with this value already exists',
      details: Object.keys(err.keyValue || {}),
    });
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.originalUrl });

  return ApiResponse.error(res, {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: isProduction ? 'Something went wrong' : err.message,
  });
}

function notFoundHandler(req, res) {
  return ApiResponse.error(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };
