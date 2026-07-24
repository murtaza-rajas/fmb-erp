const ApiError = require('../utils/ApiError');

// authorize('payment_voucher:approve') — checks req.user's role.permissions
// (populated by the authenticate middleware) contains the given permission key.
function authorize(...requiredKeys) {
  return (req, res, next) => {
    const role = req.user?.roleId;
    const grantedKeys = new Set((role?.permissions || []).map((p) => p.key));

    const hasAll = requiredKeys.every((key) => grantedKeys.has(key));
    if (!hasAll) {
      return next(ApiError.forbidden(`Missing required permission: ${requiredKeys.join(', ')}`));
    }
    next();
  };
}

module.exports = authorize;
