const { Schema, model } = require('mongoose');

const ENTRY_TYPES = ['invoice', 'payment', 'debit_note', 'credit_note', 'advance'];

// Append-only, mirrors stock_ledger's pattern: balance is always derived from
// the previous entry for that vendor, never recomputed by aggregation at
// read time. Balance is FMB's payable to the vendor — credit increases it
// (we owe more), debit decreases it (we owe less / already paid).
const vendorLedgerEntrySchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    entryType: { type: String, enum: ENTRY_TYPES, required: true },
    refType: { type: String, required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    debit: { type: Number, required: true, default: 0, min: 0 },
    credit: { type: Number, required: true, default: 0, min: 0 },
    balanceAfter: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

vendorLedgerEntrySchema.index({ vendorId: 1, timestamp: -1 });

module.exports = model('VendorLedgerEntry', vendorLedgerEntrySchema);
