const { body } = require('express-validator');
const { EXPENSE_CATEGORY } = require('../constants/enums');

const create = [
  body('category').isIn(Object.values(EXPENSE_CATEGORY)).withMessage('Valid category required'),
  body('payeeName').notEmpty().withMessage('payeeName is required'),
  body('description').optional({ values: 'falsy' }).isString(),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('expenseDate').optional({ values: 'falsy' }).isISO8601().withMessage('expenseDate must be a valid date'),
  body('fileKey').optional({ values: 'falsy' }).isString(),
];

const reject = [body('reason').notEmpty().withMessage('reason is required')];

module.exports = { create, reject };
