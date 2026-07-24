const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/summary', authorize(PERMISSIONS.REPORT_READ), dashboardController.summary);
router.get('/vendor-performance', authorize(PERMISSIONS.REPORT_READ), dashboardController.vendorPerformance);
router.get('/monthly-report', authorize(PERMISSIONS.REPORT_READ), dashboardController.monthlyReport);

module.exports = router;
