const { Schema, model } = require('mongoose');
const { DEVICE_PLATFORM } = require('../constants/enums');

const deviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true },
    fcmToken: { type: String, required: true, index: true },
    platform: { type: String, enum: Object.values(DEVICE_PLATFORM), required: true },
    lastUsedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

module.exports = model('DeviceToken', deviceTokenSchema);
