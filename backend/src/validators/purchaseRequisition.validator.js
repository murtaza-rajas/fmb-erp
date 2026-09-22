const { body } = require('express-validator');

const create = [
  body('storeId').isMongoId().withMessage('Valid storeId required'),
  body('requisitionDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('requisitionDate must be a valid date')
    .custom((value) => new Date(value) <= new Date()).withMessage('requisitionDate cannot be in the future'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('items.*.neededByDate')
    .isISO8601().withMessage('neededByDate must be a valid date')
    .custom((value, { req }) => new Date(value) >= new Date(req.body.requisitionDate || Date.now()))
    .withMessage('Needed-by date cannot be earlier than the requisition date'),
  body('items.*.reason').optional({ values: 'falsy' }).isString(),
  body('isEmergency').optional({ values: 'falsy' }).isBoolean(),
];

const update = [
  body('storeId').optional({ values: 'falsy' }).isMongoId().withMessage('Valid storeId required'),
  body('requisitionDate')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('requisitionDate must be a valid date')
    .custom((value) => new Date(value) <= new Date()).withMessage('requisitionDate cannot be in the future'),
  body('items').optional({ values: 'falsy' }).isArray({ min: 1 }),
  body('items.*.itemId').optional({ values: 'falsy' }).isMongoId(),
  body('items.*.quantity').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('items.*.neededByDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .custom((value, { req }) => new Date(value) >= new Date(req.body.requisitionDate || Date.now()))
    .withMessage('Needed-by date cannot be earlier than the requisition date'),
  body('items.*.reason').optional({ values: 'falsy' }).isString(),
  body('isEmergency').optional({ values: 'falsy' }).isBoolean(),
];

module.exports = { create, update };
