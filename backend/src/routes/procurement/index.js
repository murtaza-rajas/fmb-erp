const { Router } = require('express');
const authenticate = require('../../middlewares/authenticate.middleware');

const requisitionRoutes = require('./requisition.routes');
const purchaseOrderRoutes = require('./purchaseOrder.routes');

const router = Router();
router.use(authenticate);

router.use('/requisitions', requisitionRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);

module.exports = router;
