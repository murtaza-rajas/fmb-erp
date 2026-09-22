const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { EXPENSE_CATEGORY, APPROVAL_STATUS } = require('../constants/enums');

// Standalone HR/Administration expense tracking — deliberately separate from
// the vendor procurement pipeline (no Vendor/PO/GRN/Invoice link at all) and
// from the vendor ledger/reports, per client decision. Covers costs that
// never go through a Purchase Order: weekly-paid labour/cooks, staff salary,
// rent, utilities. payeeName is free text rather than a User/Vendor
// reference since most payees here (casual labour, landlords, utility
// companies) have no account in the system.
const expenseSchema = new Schema({
  expenseNumber: { type: String, required: true, unique: true },
  category: { type: String, enum: Object.values(EXPENSE_CATEGORY), required: true },
  payeeName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  expenseDate: { type: Date, required: true, default: Date.now },
  fileKey: { type: String }, // optional receipt/bill upload
  approvalStatus: { type: String, enum: Object.values(APPROVAL_STATUS), default: APPROVAL_STATUS.PENDING },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, trim: true },
});

expenseSchema.index({ approvalStatus: 1 });
expenseSchema.plugin(auditablePlugin);

module.exports = model('Expense', expenseSchema);
