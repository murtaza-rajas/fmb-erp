const { body } = require('express-validator');

const create = [
  body('prnId').isMongoId().withMessage('Valid prnId required'),
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.rate').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('items.*.taxId').optional({ values: 'falsy' }).isMongoId(),
];

const revise = [
  body('items').optional({ values: 'falsy' }).isArray({ min: 1 }),
  body('items.*.itemId').optional({ values: 'falsy' }).isMongoId(),
  body('items.*.quantity').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('items.*.rate').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('items.*.taxId').optional({ values: 'falsy' }).isMongoId(),
];

const cancel = [body('reason').optional({ values: 'falsy' }).isString()];

module.exports = { create, revise, cancel };
