const { Router } = require('express');
const authenticate = require('../../middlewares/authenticate.middleware');

const categoryRoutes = require('./category.routes');
const unitRoutes = require('./unit.routes');
const taxRoutes = require('./tax.routes');
const paymentTermRoutes = require('./paymentTerm.routes');
const storeRoutes = require('./store.routes');
const itemRoutes = require('./item.routes');
const vendorRoutes = require('./vendor.routes');
const thaaliBudgetRoutes = require('./thaaliBudget.routes');

const router = Router();
router.use(authenticate);

router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);
router.use('/taxes', taxRoutes);
router.use('/payment-terms', paymentTermRoutes);
router.use('/stores', storeRoutes);
router.use('/items', itemRoutes);
router.use('/vendors', vendorRoutes);
router.use('/thaali-budgets', thaaliBudgetRoutes);

module.exports = router;
