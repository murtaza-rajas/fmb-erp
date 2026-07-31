const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { MATCH_STATUS, HOLD_STATUS } = require('../constants/enums');

const invoiceItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const vendorInvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, trim: true }, // vendor's own number, not auto-generated
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  grnId: { type: Schema.Types.ObjectId, ref: 'Grn', required: true },
  items: {
    type: [invoiceItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  totalAmount: { type: Number, required: true, min: 0 },
  fileKey: { type: String },
  matchStatus: { type: String, enum: Object.values(MATCH_STATUS), default: MATCH_STATUS.PENDING },
  holdStatus: { type: String, enum: Object.values(HOLD_STATUS), default: HOLD_STATUS.NONE },
  holdReason: { type: String, trim: true },
  matchOverrideReason: { type: String, trim: true },
  matchOverriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
  matchOverriddenAt: { type: Date },
});

vendorInvoiceSchema.index({ vendorId: 1, matchStatus: 1 });

vendorInvoiceSchema.plugin(auditablePlugin);

module.exports = model('VendorInvoice', vendorInvoiceSchema);
