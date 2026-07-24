const PasswordResetToken = require('../models/PasswordResetToken.model');

class PasswordResetTokenRepository {
  create(data) {
    return PasswordResetToken.create(data);
  }

  findActiveById(id) {
    return PasswordResetToken.findOne({ _id: id, usedAt: null, expiresAt: { $gt: new Date() } });
  }

  markUsed(id) {
    return PasswordResetToken.findByIdAndUpdate(id, { usedAt: new Date() });
  }
}

module.exports = new PasswordResetTokenRepository();
