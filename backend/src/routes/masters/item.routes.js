const { Router } = require('express');
const itemController = require('../../controllers/item.controller');
const itemValidator = require('../../validators/item.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const uploadExcel = require('../../middlewares/uploadExcel.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.MASTER_READ), queryParser, itemController.list);
router.post('/', authorize(PERMISSIONS.MASTER_CREATE), itemValidator.create, validate, itemController.create);
router.post('/import', authorize(PERMISSIONS.MASTER_CREATE), uploadExcel.single('file'), itemController.importItems);
router.get('/:id', authorize(PERMISSIONS.MASTER_READ), itemController.getById);
router.patch('/:id', authorize(PERMISSIONS.MASTER_UPDATE), itemValidator.update, validate, itemController.update);
router.delete('/:id', authorize(PERMISSIONS.MASTER_DELETE), itemController.remove);
router.get('/:id/low-stock-check', authorize(PERMISSIONS.STOCK_READ), itemController.lowStockCheck);

module.exports = router;
