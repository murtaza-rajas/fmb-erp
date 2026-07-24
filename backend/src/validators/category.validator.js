const { body } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('parentCategoryId').optional({ values: 'falsy' }).isMongoId(),
  body('description').optional({ values: 'falsy' }).isString(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('parentCategoryId').optional({ values: 'falsy' }).isMongoId(),
  body('description').optional({ values: 'falsy' }).isString(),
];

module.exports = { create, update };
