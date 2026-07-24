const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

const paymentSchema = new Schema({
  voucherId: { type: Schema.Types.ObjectId, ref: 'PaymentVoucher', required: true, unique: true },
  transactionRef: { type: String, trim: true },
  paidAmount: { type: Number, required: true, min: 0 },
  paidAt: { type: Date, required: true, default: Date.now },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paymentAdviceSentAt: { type: Date },
});

paymentSchema.plugin(auditablePlugin);

module.exports = model('Payment', paymentSchema);
