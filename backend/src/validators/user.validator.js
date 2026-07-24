const { body, param } = require('express-validator');
const { STAFF_TYPES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/enums');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('roleId').isMongoId().withMessage('Valid roleId required'),
  body('staffType').isIn(Object.values(STAFF_TYPES)).withMessage('Invalid staffType'),
  body('phone').optional({ values: 'falsy' }).isString(),
  body('storeId').optional({ values: 'falsy' }).isMongoId(),
];

const update = [
  param('id').isMongoId(),
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('phone').optional({ values: 'falsy' }).isString(),
  body('storeId').optional({ values: 'falsy' }).isMongoId(),
];

const updateStatus = [
  param('id').isMongoId(),
  body('status').isIn(Object.values(USER_STATUS)).withMessage('Invalid status'),
];

const assignRole = [param('id').isMongoId(), body('roleId').isMongoId().withMessage('Valid roleId required')];

module.exports = { create, update, updateStatus, assignRole };
