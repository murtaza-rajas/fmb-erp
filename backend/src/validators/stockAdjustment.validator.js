const { body } = require('express-validator');

const create = [
  body('itemId').isMongoId().withMessage('Valid itemId required'),
  body('storeId').isMongoId().withMessage('Valid storeId required'),
  body('quantity')
    .isFloat()
    .withMessage('quantity must be a number')
    .custom((v) => Number(v) !== 0)
    .withMessage('quantity cannot be zero'),
  body('reason').notEmpty().withMessage('reason is required'),
];

module.exports = { create };
