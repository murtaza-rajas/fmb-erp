const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roleRoutes = require('./role.routes');
const permissionRoutes = require('./permission.routes');
const notificationRoutes = require('./notification.routes');
const mastersRoutes = require('./masters');
const procurementRoutes = require('./procurement');
const inventoryRoutes = require('./inventory');
const invoiceRoutes = require('./invoices');
const financeRoutes = require('./finance');
const uploadRoutes = require('./upload.routes');
const settingsRoutes = require('./settings.routes');
const appRoutes = require('./app.routes');
const dashboardRoutes = require('./dashboard.routes');
const reportRoutes = require('./report.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/masters', mastersRoutes);
router.use('/procurement', procurementRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/finance', financeRoutes);
router.use('/uploads', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/app', appRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
