const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dayjs = require('dayjs');
const { jwt: jwtConfig } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry,
  });
}

function signRefreshToken() {
  // Random opaque token — only its hash is persisted, mirroring refresh_tokens.tokenHash.
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate() {
  const match = /^(\d+)([dhm])$/.exec(jwtConfig.refreshExpiry);
  if (!match) return dayjs().add(30, 'day').toDate();
  const [, amount, unit] = match;
  const unitMap = { d: 'day', h: 'hour', m: 'minute' };
  return dayjs().add(Number(amount), unitMap[unit]).toDate();
}

module.exports = { signAccessToken, signRefreshToken, hashToken, refreshExpiryDate };
