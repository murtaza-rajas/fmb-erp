const { body } = require('express-validator');

const create = [
  body('vendorId').isMongoId().withMessage('Valid vendorId required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('paidAt').optional({ values: 'falsy' }).isISO8601(),
];

const adjust = [
  body('invoiceId').isMongoId().withMessage('Valid invoiceId required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
];

module.exports = { create, adjust };
