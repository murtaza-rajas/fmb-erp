const { Router } = require('express');
const roleController = require('../controllers/role.controller');
const roleValidator = require('../validators/role.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const queryParser = require('../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROLE_READ), queryParser, roleController.list);
router.post('/', authorize(PERMISSIONS.ROLE_CREATE), roleValidator.create, validate, roleController.create);
router.get('/:id', authorize(PERMISSIONS.ROLE_READ), roleController.getById);
router.patch('/:id/permissions', authorize(PERMISSIONS.ROLE_UPDATE), roleValidator.updatePermissions, validate, roleController.updatePermissions);
router.delete('/:id', authorize(PERMISSIONS.ROLE_DELETE), roleController.remove);

module.exports = router;
