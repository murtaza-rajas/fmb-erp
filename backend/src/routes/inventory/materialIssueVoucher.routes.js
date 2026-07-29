const { Router } = require('express');
const materialIssueController = require('../../controllers/materialIssueVoucher.controller');
const materialIssueValidator = require('../../validators/materialIssueVoucher.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.MATERIAL_ISSUE_READ), queryParser, materialIssueController.list);
router.post('/', authorize(PERMISSIONS.MATERIAL_ISSUE_CREATE), materialIssueValidator.create, validate, materialIssueController.create);
router.get('/:id', authorize(PERMISSIONS.MATERIAL_ISSUE_READ), materialIssueController.getById);

module.exports = router;
