const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { APPROVAL_STATUS } = require('../constants/enums');

const PAYMENT_MODES = ['cheque', 'neft', 'rtgs', 'upi', 'cash'];

const paymentVoucherSchema = new Schema({
  voucherNumber: { type: String, required: true, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'VendorInvoice', required: true, index: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  approvalStatus: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.PENDING },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, trim: true },
  paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
});

paymentVoucherSchema.plugin(auditablePlugin);

module.exports = model('PaymentVoucher', paymentVoucherSchema);
