const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');
const { MATERIAL_ISSUE_CATEGORY } = require('../constants/enums');

const materialIssueItemSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    lineCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const materialIssueVoucherSchema = new Schema({
  voucherNumber: { type: String, required: true, unique: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  category: { type: String, enum: Object.values(MATERIAL_ISSUE_CATEGORY), required: true, index: true },
  thaaliCount: { type: Number, required: true, min: 0 },
  // Business date material was issued for — distinct from createdAt, since a
  // voucher for yesterday's kitchen usage is often entered the next morning
  // and the Thaali Cost Report groups by this date, not by entry time.
  issueDate: { type: Date, required: true, default: Date.now, index: true },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: {
    type: [materialIssueItemSchema],
    required: true,
    validate: { validator: (v) => v.length > 0, message: 'At least one item is required' },
  },
  totalCost: { type: Number, required: true, min: 0 },
});

materialIssueVoucherSchema.index({ category: 1, issueDate: 1 });

materialIssueVoucherSchema.plugin(auditablePlugin);

module.exports = model('MaterialIssueVoucher', materialIssueVoucherSchema);
