const { body } = require('express-validator');

const create = [
  body('invoiceNumber').notEmpty().withMessage('invoiceNumber is required'),
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  // poId/grnId live per line — a consolidated invoice can cover several
  // (PO, GRN) pairs, each with its own set of items.
  body('items.*.poId').isMongoId().withMessage('Valid poId required'),
  body('items.*.grnId').isMongoId().withMessage('Valid grnId required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
  body('fileKey').optional({ values: 'falsy' }).isString(),
];

const update = [
  body('invoiceNumber').optional({ values: 'falsy' }).notEmpty(),
  body('items').optional({ values: 'falsy' }).isArray({ min: 1 }),
  body('items.*.poId').optional({ values: 'falsy' }).isMongoId(),
  body('items.*.grnId').optional({ values: 'falsy' }).isMongoId(),
  body('items.*.itemId').optional({ values: 'falsy' }).isMongoId(),
  body('items.*.quantity').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('items.*.rate').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('fileKey').optional({ values: 'falsy' }).isString(),
];

const hold = [body('reason').notEmpty().withMessage('reason is required')];

const overrideMatch = [body('reason').notEmpty().withMessage('reason is required')];

module.exports = { create, update, hold, overrideMatch };
