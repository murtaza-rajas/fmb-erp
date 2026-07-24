const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const unitSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  symbol: { type: String, required: true, trim: true },
  baseUnitId: { type: Schema.Types.ObjectId, ref: 'Unit', default: null },
  conversionFactor: { type: Number, default: 1 },
});

unitSchema.plugin(auditablePlugin);

module.exports = model('Unit', unitSchema);
