const RefreshToken = require('../models/RefreshToken.model');

class RefreshTokenRepository {
  create(data) {
    return RefreshToken.create(data);
  }

  findActiveById(id) {
    return RefreshToken.findOne({ _id: id, revokedAt: null, expiresAt: { $gt: new Date() } });
  }

  revoke(id, replacedByTokenId = null) {
    return RefreshToken.findByIdAndUpdate(id, { revokedAt: new Date(), replacedByTokenId });
  }

  revokeAllForUser(userId) {
    return RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  }

  findActiveSessionsForUser(userId) {
    return RefreshToken.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  }
}

module.exports = new RefreshTokenRepository();
