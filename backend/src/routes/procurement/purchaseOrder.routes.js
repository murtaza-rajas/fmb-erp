const { Router } = require('express');
const poController = require('../../controllers/purchaseOrder.controller');
const poValidator = require('../../validators/purchaseOrder.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.PO_READ), queryParser, poController.list);
router.post('/', authorize(PERMISSIONS.PO_CREATE), poValidator.create, validate, poController.create);
router.get('/:id', authorize(PERMISSIONS.PO_READ), poController.getById);
router.patch('/:id/issue', authorize(PERMISSIONS.PO_UPDATE), poController.issue);
router.patch('/:id/cancel', authorize(PERMISSIONS.PO_CANCEL), poValidator.cancel, validate, poController.cancel);
router.post('/:id/revise', authorize(PERMISSIONS.PO_REVISE), poValidator.revise, validate, poController.revise);
router.get('/:id/timeline', authorize(PERMISSIONS.PO_READ), poController.timeline);
router.get('/:id/print', authorize(PERMISSIONS.PO_PRINT), poController.print);
router.post('/:id/send-email', authorize(PERMISSIONS.PO_EMAIL), poController.sendEmail);

module.exports = router;
