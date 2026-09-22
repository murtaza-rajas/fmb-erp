const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { PRN_STATUS } = require('../constants/enums');

const prnItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    neededByDate: { type: Date, required: true },
    reason: { type: String, trim: true },
  },
  { _id: false }
);

const purchaseRequisitionSchema = new Schema({
  prnNumber: { type: String, required: true, unique: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Defaults to submission time, but can be set to a past date to record a
  // requisition that was actually raised earlier (paper-based catch-up entry).
  requisitionDate: { type: Date, default: Date.now },
  items: {
    type: [prnItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  isEmergency: { type: Boolean, default: false },
  status: { type: String, enum: Object.values(PRN_STATUS), default: PRN_STATUS.SUBMITTED },
});

purchaseRequisitionSchema.index({ storeId: 1, status: 1 });

purchaseRequisitionSchema.plugin(auditablePlugin);

module.exports = model('PurchaseRequisition', purchaseRequisitionSchema);
