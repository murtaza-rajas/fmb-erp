const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const vendorItemRateSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  rate: { type: Number, required: true, min: 0 },
  effectiveFrom: { type: Date, required: true, default: Date.now },
  effectiveTo: { type: Date, default: null },
  quotationRef: { type: String, trim: true },
});

vendorItemRateSchema.index({ vendorId: 1, itemId: 1, effectiveFrom: -1 });

vendorItemRateSchema.plugin(auditablePlugin);

module.exports = model('VendorItemRate', vendorItemRateSchema);
