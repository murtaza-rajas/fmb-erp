const { body } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('days').isInt({ min: 0 }).withMessage('Days must be a non-negative integer'),
  body('description').optional({ values: 'falsy' }).isString(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('days').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('description').optional({ values: 'falsy' }).isString(),
];

module.exports = { create, update };
