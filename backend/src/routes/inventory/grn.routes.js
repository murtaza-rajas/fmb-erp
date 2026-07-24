const { Router } = require('express');
const grnController = require('../../controllers/grn.controller');
const grnValidator = require('../../validators/grn.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.GRN_READ), queryParser, grnController.list);
router.post('/', authorize(PERMISSIONS.GRN_CREATE), grnValidator.create, validate, grnController.create);
router.get('/:id', authorize(PERMISSIONS.GRN_READ), grnController.getById);

module.exports = router;
