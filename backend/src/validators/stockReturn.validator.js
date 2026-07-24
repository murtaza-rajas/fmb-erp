const { body } = require('express-validator');

const create = [
  body('storeId').isMongoId().withMessage('Valid storeId required'),
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
];

module.exports = { create };
