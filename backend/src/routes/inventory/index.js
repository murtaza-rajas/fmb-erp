const { Router } = require('express');
const authenticate = require('../../middlewares/authenticate.middleware');

const grnRoutes = require('./grn.routes');
const stockRoutes = require('./stock.routes');
const debitNoteRoutes = require('./debitNote.routes');
const creditNoteRoutes = require('./creditNote.routes');

const router = Router();
router.use(authenticate);

router.use('/grns', grnRoutes);
router.use('/debit-notes', debitNoteRoutes);
router.use('/credit-notes', creditNoteRoutes);
// stock.routes.js defines its own full paths (stock-ledger, stock-balance,
// reorder-alerts, adjustments, transfers, stock-returns) mounted at the root.
router.use('/', stockRoutes);

module.exports = router;
