const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { MATCH_STATUS, HOLD_STATUS } = require('../constants/enums');

// poId/grnId live per line rather than once on the invoice — a vendor's
// consolidated invoice can cover several Purchase Orders (and since a GRN
// always belongs to exactly one PO, "multiple POs" really means multiple
// (PO, GRN) pairs), and each line needs to stay traceable to the specific PO
// + GRN it was billed against for PO-status advancement and audit purposes.
const invoiceItemSchema = new Schema(
  {
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    grnId: { type: Schema.Types.ObjectId, ref: 'Grn', required: true },
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
// A GRN represents one physical delivery — it can only ever be billed once,
// whether that's on a single-PO invoice or as one leg of a consolidated
// multi-PO invoice. A vendor also shouldn't have the same invoice number
// entered twice. Both are partial (isDeleted: false) so a soft-deleted
// invoice doesn't block a legitimate resubmission. The first is a multikey
// index (items.grnId is an array path) — Mongo enforces uniqueness of each
// element value across the whole collection, which is exactly "no GRN
// appears on more than one invoice."
vendorInvoiceSchema.index({ 'items.grnId': 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
vendorInvoiceSchema.index({ vendorId: 1, invoiceNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

vendorInvoiceSchema.plugin(auditablePlugin);

module.exports = model('VendorInvoice', vendorInvoiceSchema);
