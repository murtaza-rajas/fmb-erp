const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const paymentTermSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  days: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
});

paymentTermSchema.plugin(auditablePlugin);

module.exports = model('PaymentTerm', paymentTermSchema);
