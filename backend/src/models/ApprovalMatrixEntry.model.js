const { Schema, model } = require('mongoose');
const auditablePlugin = require('./plugins/auditable.plugin');

// Per the SOP's exception clause: emergency purchases are still "subject to
// approval matrix" even though the normal PRN→PO flow has no approval step
// (see docs/architecture/database-schema.md § approval_matrix). This is a
// compliance check for emergency purchases, not a blocking gate on the
// normal flow — confirmed decision, see project memory.
const approvalMatrixEntrySchema = new Schema({
  module: { type: String, required: true, default: 'emergency_purchase' },
  amountThreshold: { type: Number, required: true, min: 0 },
  requiredApproverRoleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
  isActive: { type: Boolean, default: true },
});

approvalMatrixEntrySchema.plugin(auditablePlugin);

module.exports = model('ApprovalMatrixEntry', approvalMatrixEntrySchema);
