const { Schema, model } = require('mongoose');
const { STOCK_TXN_TYPE } = require('../constants/enums');

// Append-only — entries are never updated or deleted, only inserted. See
// services/stockLedger.service.js for the only place that should write here.
const stockLedgerSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    transactionType: { type: String, enum: Object.values(STOCK_TXN_TYPE), required: true },
    refType: { type: String, required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true }, // signed: + in, - out
    balanceAfter: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

stockLedgerSchema.index({ itemId: 1, storeId: 1, timestamp: -1 });

module.exports = model('StockLedger', stockLedgerSchema);
