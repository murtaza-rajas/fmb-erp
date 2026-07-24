const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const returnItemSchema = new Schema(
  { itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, quantity: { type: Number, required: true, min: 0 } },
  { _id: false }
);

const stockReturnSchema = new Schema({
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: {
    type: [returnItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  linkedDnId: { type: Schema.Types.ObjectId, ref: 'DebitNote' },
  status: { type: String, default: 'completed' },
});

stockReturnSchema.plugin(auditablePlugin);

module.exports = model('StockReturn', stockReturnSchema);
