const { Router } = require('express');
const paymentController = require('../../controllers/payment.controller');
const paymentValidator = require('../../validators/payment.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.PAYMENT_READ), queryParser, paymentController.list);
router.post('/', authorize(PERMISSIONS.PAYMENT_CREATE), paymentValidator.create, validate, paymentController.create);
router.get('/:id', authorize(PERMISSIONS.PAYMENT_READ), paymentController.getById);
router.get('/:id/advice', authorize(PERMISSIONS.PAYMENT_READ), paymentController.advice);

module.exports = router;
