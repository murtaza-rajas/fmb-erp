const { Schema, model } = require('mongoose');
const { NOTIFICATION_CHANNEL } = require('../constants/enums');

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    channel: { type: String, enum: Object.values(NOTIFICATION_CHANNEL), default: NOTIFICATION_CHANNEL.IN_APP },
    isRead: { type: Boolean, default: false },
    sentAt: { type: Date, default: Date.now },
    pushDeliveryStatus: { type: String, enum: ['sent', 'failed', 'skipped'] },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = model('Notification', notificationSchema);
