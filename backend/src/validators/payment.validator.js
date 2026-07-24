const { body } = require('express-validator');

const create = [
  body('voucherId').isMongoId().withMessage('Valid voucherId required'),
  body('transactionRef').optional({ values: 'falsy' }).isString(),
];

module.exports = { create };
