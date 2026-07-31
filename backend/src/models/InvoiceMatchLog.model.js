const { Schema, model } = require('mongoose');
const { MATCH_STATUS } = require('../constants/enums');

const discrepancySchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
    field: { type: String, required: true }, // 'quantity' | 'rate'
    poValue: { type: Number },
    grnValue: { type: Number },
    invoiceValue: { type: Number },
  },
  { _id: false }
);

// Append-only — an invoice can be re-matched after a correction, and each
// attempt gets its own log entry rather than overwriting the last one.
const invoiceMatchLogSchema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'VendorInvoice', required: true, index: true },
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    grnId: { type: Schema.Types.ObjectId, ref: 'Grn', required: true },
    discrepancies: { type: [discrepancySchema], default: [] },
    matchedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    result: { type: String, enum: [MATCH_STATUS.MATCHED, MATCH_STATUS.MISMATCHED, MATCH_STATUS.OVERRIDDEN], required: true },
    // Only set for a MATCH_STATUS.OVERRIDDEN entry — the mandatory reason
    // Purchase gave for manually accepting a known discrepancy.
    reason: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'matchedAt', updatedAt: false } }
);

module.exports = model('InvoiceMatchLog', invoiceMatchLogSchema);
