const { body } = require('express-validator');
const { MATERIAL_ISSUE_CATEGORY } = require('../constants/enums');

const create = [
  body('storeId').isMongoId().withMessage('Valid storeId required'),
  body('category').isIn(Object.values(MATERIAL_ISSUE_CATEGORY)).withMessage('Valid category required'),
  body('thaaliCount').isFloat({ min: 0 }).withMessage('thaaliCount must be a non-negative number'),
  body('issueDate').optional({ values: 'falsy' }).isISO8601().withMessage('issueDate must be a valid date'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
];

module.exports = { create };
