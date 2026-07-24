const { Router } = require('express');
const advancePaymentController = require('../../controllers/advancePayment.controller');
const advancePaymentValidator = require('../../validators/advancePayment.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.PAYMENT_READ), queryParser, advancePaymentController.list);
router.post('/', authorize(PERMISSIONS.PAYMENT_CREATE), advancePaymentValidator.create, validate, advancePaymentController.create);
router.patch('/:id/adjust', authorize(PERMISSIONS.PAYMENT_CREATE), advancePaymentValidator.adjust, validate, advancePaymentController.adjust);

module.exports = router;
