const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const { jwt: jwtConfig } = require('../config/env');
const { USER_STATUS } = require('../constants/enums');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.accessSecret);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token'
    );
  }

  const user = await User.findById(payload.sub).populate({
    path: 'roleId',
    populate: { path: 'permissions' },
  });

  if (!user || user.isDeleted) {
    throw ApiError.unauthorized('User no longer exists');
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('User account is not active');
  }

  req.user = user;
  next();
});

module.exports = authenticate;
