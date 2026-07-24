const { body } = require('express-validator');

const create = [
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('poId').optional({ values: 'falsy' }).isMongoId(),
  body('grnId').optional({ values: 'falsy' }).isMongoId(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
  body('items.*.amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
  body('items.*.reason').notEmpty().withMessage('reason is required'),
];

module.exports = { create };
