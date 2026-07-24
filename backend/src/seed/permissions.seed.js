const { PERMISSIONS, PAYMENT_APPROVAL_GATED_PERMISSIONS } = require('../constants/permissions');

// module/action are derived from the key ("module:action") and description is
// generated from it; only the module-key list is maintained here.
const PERMISSION_KEYS = Object.values(PERMISSIONS);

const permissionSeedData = PERMISSION_KEYS.map((key) => {
  const [moduleName, action] = key.split(':');
  return {
    key,
    module: moduleName,
    action,
    description: `${action.replace(/_/g, ' ')} on ${moduleName.replace(/_/g, ' ')}`,
    isPaymentApprovalGate: PAYMENT_APPROVAL_GATED_PERMISSIONS.includes(key),
  };
});

module.exports = permissionSeedData;
