const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { STOCK_TRANSFER_STATUS } = require('../constants/enums');

const transferItemSchema = new Schema(
  { itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, quantity: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const stockTransferSchema = new Schema({
  fromStoreId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  toStoreId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  items: {
    type: [transferItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  status: { type: String, enum: Object.values(STOCK_TRANSFER_STATUS), default: STOCK_TRANSFER_STATUS.PENDING },
});

stockTransferSchema.plugin(auditablePlugin);

module.exports = model('StockTransfer', stockTransferSchema);
