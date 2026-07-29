const { body } = require('express-validator');
const { MATERIAL_ISSUE_CATEGORY } = require('../constants/enums');

const create = [
  body('category').isIn(Object.values(MATERIAL_ISSUE_CATEGORY)).withMessage('Valid category required'),
  body('weekStartDate').isISO8601().withMessage('weekStartDate must be a valid date'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
];

const update = [
  body('category').optional({ values: 'falsy' }).isIn(Object.values(MATERIAL_ISSUE_CATEGORY)),
  body('weekStartDate').optional({ values: 'falsy' }).isISO8601(),
  body('amount').optional({ values: 'falsy' }).isFloat({ min: 0 }),
];

module.exports = { create, update };
