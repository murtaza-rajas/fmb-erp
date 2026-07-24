const { body } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('sku').optional({ values: 'falsy' }).isString(),
  body('categoryId').isMongoId().withMessage('Valid categoryId required'),
  body('unitId').isMongoId().withMessage('Valid unitId required'),
  body('reorderLevel').isFloat({ min: 0 }).withMessage('reorderLevel must be a non-negative number'),
  body('standardRate').isFloat({ min: 0 }).withMessage('standardRate must be a non-negative number'),
  body('taxId').optional({ values: 'falsy' }).isMongoId(),
  body('barcodeValue').optional({ values: 'falsy' }).isString(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('sku').optional({ values: 'falsy' }).isString(),
  body('categoryId').optional({ values: 'falsy' }).isMongoId(),
  body('unitId').optional({ values: 'falsy' }).isMongoId(),
  body('reorderLevel').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('standardRate').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('taxId').optional({ values: 'falsy' }).isMongoId(),
  body('barcodeValue').optional({ values: 'falsy' }).isString(),
  body('isActive').optional({ values: 'falsy' }).isBoolean(),
];

module.exports = { create, update };
