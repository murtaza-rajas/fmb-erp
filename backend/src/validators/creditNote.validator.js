const { body } = require('express-validator');

const create = [
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('reason').notEmpty().withMessage('reason is required'),
];

module.exports = { create };
