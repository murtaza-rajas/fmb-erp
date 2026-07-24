const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const itemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
  reorderLevel: { type: Number, required: true, min: 0 },
  standardRate: { type: Number, required: true, min: 0 },
  taxId: { type: Schema.Types.ObjectId, ref: 'Tax' },
  barcodeValue: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
});

itemSchema.index({ name: 'text' });
itemSchema.index({ categoryId: 1 });

itemSchema.plugin(auditablePlugin);

module.exports = model('Item', itemSchema);
