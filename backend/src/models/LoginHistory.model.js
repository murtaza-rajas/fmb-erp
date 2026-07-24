const { Schema, model } = require('mongoose');

const loginHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = model('LoginHistory', loginHistorySchema);
