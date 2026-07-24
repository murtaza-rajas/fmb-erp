const Otp = require('../models/Otp.model');

class OtpRepository {
  create(data) {
    return Otp.create(data);
  }

  findLatestActive(identifier, purpose) {
    return Otp.findOne({ identifier, purpose, consumedAt: null, expiresAt: { $gt: new Date() } })
      .select('+codeHash')
      .sort({ createdAt: -1 });
  }

  markConsumed(id) {
    return Otp.findByIdAndUpdate(id, { consumedAt: new Date() });
  }

  incrementAttempts(id) {
    return Otp.findByIdAndUpdate(id, { $inc: { attempts: 1 } });
  }
}

module.exports = new OtpRepository();
