const { Router } = require('express');
const reportController = require('../controllers/report.controller');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const ApiError = require('../utils/ApiError');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);
router.use(authorize(PERMISSIONS.REPORT_READ));

// Exporting (csv/excel/pdf, via ?format=) requires the separate
// report:export permission on top of report:read, which just views JSON.
function requireExportIfRequested(req, res, next) {
  if (!req.query.format) return next();
  const grantedKeys = new Set((req.user.roleId?.permissions || []).map((p) => p.key));
  if (!grantedKeys.has(PERMISSIONS.REPORT_EXPORT)) {
    return next(ApiError.forbidden(`Missing required permission: ${PERMISSIONS.REPORT_EXPORT}`));
  }
  next();
}

router.use(requireExportIfRequested);

router.get('/purchases', reportController.purchases);
router.get('/vendors', reportController.vendors);
router.get('/inventory', reportController.inventory);
router.get('/stock-ledger', reportController.stockLedger);
router.get('/payments', reportController.payments);
router.get('/audit', reportController.audit);
router.get('/user-activity', reportController.userActivity);

module.exports = router;
