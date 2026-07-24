const { body } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('address').optional({ values: 'falsy' }).isString(),
  body('responsiblePersonId').optional({ values: 'falsy' }).isMongoId(),
  body('contact').optional({ values: 'falsy' }).isString(),
  body('isDefault').optional({ values: 'falsy' }).isBoolean(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('address').optional({ values: 'falsy' }).isString(),
  body('responsiblePersonId').optional({ values: 'falsy' }).isMongoId(),
  body('contact').optional({ values: 'falsy' }).isString(),
  body('isDefault').optional({ values: 'falsy' }).isBoolean(),
];

module.exports = { create, update };
