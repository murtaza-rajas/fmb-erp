const { body } = require('express-validator');

const create = [
  body('fromStoreId').isMongoId().withMessage('Valid fromStoreId required'),
  body('toStoreId').isMongoId().withMessage('Valid toStoreId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
];

module.exports = { create };
