const { body, param } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').optional({ values: 'falsy' }).isString(),
  body('permissionIds').optional({ values: 'falsy' }).isArray(),
  body('permissionIds.*').optional({ values: 'falsy' }).isMongoId(),
];

const updatePermissions = [
  param('id').isMongoId(),
  body('permissionIds').isArray().withMessage('permissionIds must be an array'),
  body('permissionIds.*').isMongoId(),
];

module.exports = { create, updatePermissions };
