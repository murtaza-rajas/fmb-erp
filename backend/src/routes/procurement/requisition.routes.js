const { Router } = require('express');
const prnController = require('../../controllers/purchaseRequisition.controller');
const prnValidator = require('../../validators/purchaseRequisition.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.PRN_READ), queryParser, prnController.list);
router.post('/', authorize(PERMISSIONS.PRN_CREATE), prnValidator.create, validate, prnController.create);
router.get('/:id', authorize(PERMISSIONS.PRN_READ), prnController.getById);
router.patch('/:id', authorize(PERMISSIONS.PRN_UPDATE), prnValidator.update, validate, prnController.update);
router.patch('/:id/cancel', authorize(PERMISSIONS.PRN_CANCEL), prnController.cancel);

module.exports = router;
