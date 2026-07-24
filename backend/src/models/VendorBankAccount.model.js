const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const vendorBankAccountSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  accountHolderName: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  ifsc: { type: String, required: true, trim: true, uppercase: true },
  isPrimary: { type: Boolean, default: false },
});

vendorBankAccountSchema.plugin(auditablePlugin);

module.exports = model('VendorBankAccount', vendorBankAccountSchema);
