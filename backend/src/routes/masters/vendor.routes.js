const { Router } = require('express');
const vendorController = require('../../controllers/vendor.controller');
const vendorValidator = require('../../validators/vendor.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.MASTER_READ), queryParser, vendorController.list);
router.post('/', authorize(PERMISSIONS.MASTER_CREATE), vendorValidator.create, validate, vendorController.create);
router.get('/:id', authorize(PERMISSIONS.MASTER_READ), vendorController.getById);
router.patch('/:id', authorize(PERMISSIONS.MASTER_UPDATE), vendorValidator.update, validate, vendorController.update);
router.delete('/:id', authorize(PERMISSIONS.MASTER_DELETE), vendorController.remove);

router.get('/:id/bank-accounts', authorize(PERMISSIONS.MASTER_READ), vendorController.listBankAccounts);
router.post('/:id/bank-accounts', authorize(PERMISSIONS.MASTER_UPDATE), vendorValidator.addBankAccount, validate, vendorController.addBankAccount);
router.delete('/:id/bank-accounts/:accountId', authorize(PERMISSIONS.MASTER_UPDATE), vendorController.removeBankAccount);

router.get('/:id/item-rates', authorize(PERMISSIONS.MASTER_READ), vendorController.listItemRates);
router.post('/:id/item-rates', authorize(PERMISSIONS.MASTER_UPDATE), vendorValidator.addItemRate, validate, vendorController.addItemRate);

module.exports = router;
