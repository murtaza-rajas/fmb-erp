const { Router } = require('express');
const userController = require('../controllers/user.controller');
const userValidator = require('../validators/user.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const queryParser = require('../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.USER_READ), queryParser, userController.list);
router.post('/', authorize(PERMISSIONS.USER_CREATE), userValidator.create, validate, userController.create);
router.get('/:id', authorize(PERMISSIONS.USER_READ), userController.getById);
router.patch('/:id', authorize(PERMISSIONS.USER_UPDATE), userValidator.update, validate, userController.update);
router.patch('/:id/status', authorize(PERMISSIONS.USER_UPDATE), userValidator.updateStatus, validate, userController.updateStatus);
router.patch('/:id/role', authorize(PERMISSIONS.USER_MANAGE_ROLES), userValidator.assignRole, validate, userController.assignRole);
router.delete('/:id', authorize(PERMISSIONS.USER_DELETE), userController.remove);

module.exports = router;
