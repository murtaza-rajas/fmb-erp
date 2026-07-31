const { body } = require('express-validator');

const create = [
  body('invoiceNumber').notEmpty().withMessage('invoiceNumber is required'),
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('poId').isMongoId().withMessage('Valid poId required'),
  body('grnId').isMongoId().withMessage('Valid grnId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
  body('fileKey').optional({ values: 'falsy' }).isString(),
];

const hold = [body('reason').notEmpty().withMessage('reason is required')];

const overrideMatch = [body('reason').notEmpty().withMessage('reason is required')];

module.exports = { create, hold, overrideMatch };
