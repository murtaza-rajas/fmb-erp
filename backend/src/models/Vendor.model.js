const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const vendorSchema = new Schema({
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  paymentTermsId: { type: Schema.Types.ObjectId, ref: 'PaymentTerm' },
  itemsSupplied: [{ type: Schema.Types.ObjectId, ref: 'Item' }],
});

vendorSchema.index({ name: 'text' });

vendorSchema.plugin(auditablePlugin);

module.exports = model('Vendor', vendorSchema);
