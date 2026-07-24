const ApiError = require('../../utils/ApiError');
const { STAFF_TYPES } = require('../../constants/roles');

// Hard business-rule gate from the SOP: "Access to payment approval should be
// restricted to paid staff roles" (FMB's Paid vs Khidmat Gujar structure).
// A role whose permission set includes a payment-approval-gated permission
// must never end up with a khidmat_gujar member — enforced here, not left to
// admin configuration discipline. `role.permissions` must be populated.
function assertStaffTypeAllowsRole(staffType, role) {
  const hasGatedPermission = (role.permissions || []).some((p) => p.isPaymentApprovalGate);
  if (hasGatedPermission && staffType !== STAFF_TYPES.PAID) {
    throw ApiError.forbidden(
      `Role "${role.name}" grants payment-approval access, which is restricted to paid staff. This user is staffType "${staffType}".`,
      'PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF'
    );
  }
}

module.exports = { assertStaffTypeAllowsRole };
