const { Router } = require('express');
const voucherController = require('../../controllers/paymentVoucher.controller');
const voucherValidator = require('../../validators/paymentVoucher.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.PAYMENT_VOUCHER_READ), queryParser, voucherController.list);
router.post('/', authorize(PERMISSIONS.PAYMENT_VOUCHER_CREATE), voucherValidator.create, validate, voucherController.create);
router.get('/:id', authorize(PERMISSIONS.PAYMENT_VOUCHER_READ), voucherController.getById);
router.patch('/:id/approve', authorize(PERMISSIONS.PAYMENT_VOUCHER_APPROVE), voucherController.approve);
router.patch('/:id/reject', authorize(PERMISSIONS.PAYMENT_VOUCHER_REJECT), voucherValidator.reject, validate, voucherController.reject);

module.exports = router;
