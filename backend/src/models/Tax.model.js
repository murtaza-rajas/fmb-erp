const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { TAX_TYPE } = require('../constants/enums');

const taxSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  rate: { type: Number, required: true, min: 0 },
  type: { type: String, enum: Object.values(TAX_TYPE), default: TAX_TYPE.GST },
  isDefault: { type: Boolean, default: false },
});

taxSchema.plugin(auditablePlugin);

module.exports = model('Tax', taxSchema);
