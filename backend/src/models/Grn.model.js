const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { GRN_QUALITY_STATUS, REJECTION_REASON } = require('../constants/enums');

const grnItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    orderedQty: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, required: true, min: 0 },
    rejectedQty: { type: Number, default: 0, min: 0 },
    rejectionReason: { type: String, enum: Object.values(REJECTION_REASON) },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const attachmentSchema = new Schema(
  {
    fileKey: { type: String, required: true },
    contentType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const grnSchema = new Schema({
  grnNumber: { type: String, required: true, unique: true },
  poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  items: {
    type: [grnItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  qualityCheckStatus: { type: String, enum: Object.values(GRN_QUALITY_STATUS), default: GRN_QUALITY_STATUS.PENDING },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isPartial: { type: Boolean, default: false },
  attachments: { type: [attachmentSchema], default: [] },
});

grnSchema.plugin(auditablePlugin);

module.exports = model('Grn', grnSchema);
