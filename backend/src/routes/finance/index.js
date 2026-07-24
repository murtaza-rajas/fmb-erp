const { Router } = require('express');
const authenticate = require('../../middlewares/authenticate.middleware');

const paymentVoucherRoutes = require('./paymentVoucher.routes');
const paymentRoutes = require('./payment.routes');
const advancePaymentRoutes = require('./advancePayment.routes');
const vendorLedgerRoutes = require('./vendorLedger.routes');

const router = Router();
router.use(authenticate);

router.use('/payment-vouchers', paymentVoucherRoutes);
router.use('/payments', paymentRoutes);
router.use('/advance-payments', advancePaymentRoutes);
router.use('/vendor-ledger', vendorLedgerRoutes);

module.exports = router;
