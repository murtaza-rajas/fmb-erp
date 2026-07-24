const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { PO_STATUS } = require('../constants/enums');

const poItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    taxId: { type: Schema.Types.ObjectId, ref: 'Tax' },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema({
  poNumber: { type: String, required: true, unique: true },
  prnId: { type: Schema.Types.ObjectId, ref: 'PurchaseRequisition', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  items: {
    type: [poItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(PO_STATUS), default: PO_STATUS.DRAFT, index: true },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  issuedAt: { type: Date },
  revisionNumber: { type: Number, default: 0 },
  parentPoId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', default: null },
  emailSentAt: { type: Date },
});

purchaseOrderSchema.index({ vendorId: 1, status: 1 });

purchaseOrderSchema.plugin(auditablePlugin);

module.exports = model('PurchaseOrder', purchaseOrderSchema);
