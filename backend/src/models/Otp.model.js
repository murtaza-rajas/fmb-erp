const { Schema, model } = require('mongoose');
const { OTP_PURPOSE } = require('../constants/enums');

const otpSchema = new Schema(
  {
    identifier: { type: String, required: true, index: true },
    codeHash: { type: String, required: true, select: false },
    purpose: { type: String, enum: Object.values(OTP_PURPOSE), required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Otp', otpSchema);
