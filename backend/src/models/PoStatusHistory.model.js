const { Schema, model } = require('mongoose');

const poStatusHistorySchema = new Schema(
  {
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

module.exports = model('PoStatusHistory', poStatusHistorySchema);
