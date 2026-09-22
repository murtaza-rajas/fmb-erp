const { Router } = require('express');
const expenseController = require('../../controllers/expense.controller');
const expenseValidator = require('../../validators/expense.validator');
const validate = require('../../middlewares/validate.middleware');
const authorize = require('../../middlewares/authorize.middleware');
const queryParser = require('../../middlewares/queryParser.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

const router = Router();

router.get('/', authorize(PERMISSIONS.EXPENSE_READ), queryParser, expenseController.list);
router.post('/', authorize(PERMISSIONS.EXPENSE_CREATE), expenseValidator.create, validate, expenseController.create);
router.get('/:id', authorize(PERMISSIONS.EXPENSE_READ), expenseController.getById);
router.patch('/:id/approve', authorize(PERMISSIONS.EXPENSE_APPROVE), expenseController.approve);
router.patch('/:id/reject', authorize(PERMISSIONS.EXPENSE_REJECT), expenseValidator.reject, validate, expenseController.reject);

module.exports = router;
