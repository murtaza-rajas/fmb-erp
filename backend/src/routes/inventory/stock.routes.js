const { Router } = require('express');
const stockLedgerController = require('../../controllers/stockLedger.controller');
const stockAdjustmentController = require('../../controllers/stockAdjustment.controller');
const stockTransferController = require('../../controllers/stockTransfer.controller');
const stockReturnController = require('../../controllers/stockReturn.controller');
const stockAdjustmentValidator = require('../../validators/stockAdjustment.validator');
const stockTransferValidator = require('../../validators/stockTransfer.validator');
const stockReturnValidator = require('../../validators/stockReturn.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/stock-ledger', authorize(PERMISSIONS.STOCK_READ), queryParser, stockLedgerController.list);
router.get('/stock-balance', authorize(PERMISSIONS.STOCK_READ), stockLedgerController.balance);
router.get('/reorder-alerts', authorize(PERMISSIONS.STOCK_READ), stockLedgerController.reorderAlerts);

router.get('/adjustments', authorize(PERMISSIONS.STOCK_READ), queryParser, stockAdjustmentController.list);
router.post('/adjustments', authorize(PERMISSIONS.STOCK_ADJUST), stockAdjustmentValidator.create, validate, stockAdjustmentController.create);

router.get('/transfers', authorize(PERMISSIONS.STOCK_READ), queryParser, stockTransferController.list);
router.post('/transfers', authorize(PERMISSIONS.STOCK_TRANSFER), stockTransferValidator.create, validate, stockTransferController.create);
router.patch('/transfers/:id/in-transit', authorize(PERMISSIONS.STOCK_TRANSFER), stockTransferController.markInTransit);
router.patch('/transfers/:id/complete', authorize(PERMISSIONS.STOCK_TRANSFER), stockTransferController.complete);

router.get('/stock-returns', authorize(PERMISSIONS.STOCK_READ), queryParser, stockReturnController.list);
router.post('/stock-returns', authorize(PERMISSIONS.STOCK_RETURN), stockReturnValidator.create, validate, stockReturnController.create);

module.exports = router;
