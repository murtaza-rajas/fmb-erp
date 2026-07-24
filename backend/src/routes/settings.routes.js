const { Router } = require('express');
const settingsController = require('../controllers/settings.controller');
const settingsValidator = require('../validators/settings.validator');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/authenticate.middleware');
const authorize = require('../middlewares/authorize.middleware');
const { PERMISSIONS } = require('../constants/permissions');

const router = Router();
router.use(authenticate);

router.get('/company', authorize(PERMISSIONS.SETTINGS_READ), settingsController.getCompany);
router.patch('/company', authorize(PERMISSIONS.SETTINGS_UPDATE), settingsValidator.updateCompany, validate, settingsController.updateCompany);

router.get('/system', authorize(PERMISSIONS.SETTINGS_READ), settingsController.getSystem);
router.patch('/system', authorize(PERMISSIONS.SETTINGS_UPDATE), settingsValidator.updateSystem, validate, settingsController.updateSystem);

router.get('/approval-matrix', authorize(PERMISSIONS.SETTINGS_READ), settingsController.listApprovalMatrix);
router.post('/approval-matrix', authorize(PERMISSIONS.SETTINGS_UPDATE), settingsValidator.createApprovalMatrixEntry, validate, settingsController.createApprovalMatrixEntry);
router.patch('/approval-matrix/:id', authorize(PERMISSIONS.SETTINGS_UPDATE), settingsValidator.updateApprovalMatrixEntry, validate, settingsController.updateApprovalMatrixEntry);

module.exports = router;
