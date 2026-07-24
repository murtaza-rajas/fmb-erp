const { body } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('symbol').notEmpty().withMessage('Symbol is required'),
  body('baseUnitId').optional({ values: 'falsy' }).isMongoId(),
  body('conversionFactor').optional({ values: 'falsy' }).isFloat({ min: 0 }),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('symbol').optional({ values: 'falsy' }).notEmpty(),
  body('baseUnitId').optional({ values: 'falsy' }).isMongoId(),
  body('conversionFactor').optional({ values: 'falsy' }).isFloat({ min: 0 }),
];

module.exports = { create, update };
