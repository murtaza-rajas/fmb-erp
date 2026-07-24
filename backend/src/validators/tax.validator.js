const { body } = require('express-validator');
const { TAX_TYPE } = require('../constants/enums');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('rate').isFloat({ min: 0 }).withMessage('Rate must be a non-negative number'),
  body('type').optional({ values: 'falsy' }).isIn(Object.values(TAX_TYPE)),
  body('isDefault').optional({ values: 'falsy' }).isBoolean(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('rate').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('type').optional({ values: 'falsy' }).isIn(Object.values(TAX_TYPE)),
  body('isDefault').optional({ values: 'falsy' }).isBoolean(),
];

module.exports = { create, update };
