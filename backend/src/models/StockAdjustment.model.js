const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const stockAdjustmentSchema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
  quantity: { type: Number, required: true }, // signed
  reason: { type: String, required: true, trim: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

stockAdjustmentSchema.plugin(auditablePlugin);

module.exports = model('StockAdjustment', stockAdjustmentSchema);
