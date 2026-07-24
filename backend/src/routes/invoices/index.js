const { Router } = require('express');
const invoiceController = require('../../controllers/vendorInvoice.controller');
const invoiceValidator = require('../../validators/vendorInvoice.validator');
const validate = require('../../middlewares/validate.middleware');
const authenticate = require('../../middlewares/authenticate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.INVOICE_READ), queryParser, invoiceController.list);
router.post('/', authorize(PERMISSIONS.INVOICE_CREATE), invoiceValidator.create, validate, invoiceController.create);
router.get('/:id', authorize(PERMISSIONS.INVOICE_READ), invoiceController.getById);
router.post('/:id/match', authorize(PERMISSIONS.INVOICE_MATCH), invoiceController.match);
router.get('/:id/match-history', authorize(PERMISSIONS.INVOICE_READ), invoiceController.matchHistory);
router.patch('/:id/hold', authorize(PERMISSIONS.INVOICE_HOLD), invoiceValidator.hold, validate, invoiceController.hold);
router.patch('/:id/release', authorize(PERMISSIONS.INVOICE_RELEASE), invoiceController.release);

module.exports = router;
