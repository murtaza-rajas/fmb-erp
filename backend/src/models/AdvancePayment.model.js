const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const advancePaymentSchema = new Schema({
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  paidAt: { type: Date, required: true, default: Date.now },
  adjustedAgainstInvoiceId: { type: Schema.Types.ObjectId, ref: 'VendorInvoice', default: null },
  balanceRemaining: { type: Number, required: true, min: 0 },
});

advancePaymentSchema.plugin(auditablePlugin);

module.exports = model('AdvancePayment', advancePaymentSchema);
