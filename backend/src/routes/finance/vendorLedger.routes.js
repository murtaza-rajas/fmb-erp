const { Router } = require('express');
const vendorLedgerController = require('../../controllers/vendorLedger.controller');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/outstanding-payments', authorize(PERMISSIONS.VENDOR_LEDGER_READ), vendorLedgerController.outstandingPayments);
router.get('/:vendorId', authorize(PERMISSIONS.VENDOR_LEDGER_READ), queryParser, vendorLedgerController.getLedger);

module.exports = router;
