const { body } = require('express-validator');

const PAYMENT_MODES = ['cheque', 'neft', 'rtgs', 'upi', 'cash'];

const create = [
  body('invoiceId').isMongoId().withMessage('Valid invoiceId required'),
  body('amount').optional({ values: 'falsy' }).isFloat({ gt: 0 }),
  body('paymentMode').isIn(PAYMENT_MODES).withMessage('Invalid paymentMode'),
];

const reject = [body('reason').notEmpty().withMessage('reason is required')];

module.exports = { create, reject };
