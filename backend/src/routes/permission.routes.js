const { Router } = require('express');
const permissionController = require('../controllers/permission.controller');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROLE_READ), permissionController.list);

module.exports = router;
