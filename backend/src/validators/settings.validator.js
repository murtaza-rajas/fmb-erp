const { body } = require('express-validator');

const updateCompany = [
  body('name').optional({ values: 'falsy' }).isString(),
  body('logoUrl').optional({ values: 'falsy' }).isString(),
  body('address').optional({ values: 'falsy' }).isString(),
  body('gstin').optional({ values: 'falsy' }).isString(),
  body('financialYearStartMonth').optional({ values: 'falsy' }).isInt({ min: 1, max: 12 }),
  body('currency').optional({ values: 'falsy' }).isString(),
];

const updateSystem = [
  body('latestVersion').optional({ values: 'falsy' }).isString(),
  body('minSupportedVersion').optional({ values: 'falsy' }).isString(),
  body('forceUpdate').optional({ values: 'falsy' }).isBoolean(),
  body('maintenanceMode').optional({ values: 'falsy' }).isBoolean(),
  body('maintenanceMessage').optional({ values: 'falsy' }).isString(),
  body('backupScheduleCron').optional({ values: 'falsy' }).isString(),
];

const createApprovalMatrixEntry = [
  body('module').optional({ values: 'falsy' }).isString(),
  body('amountThreshold').isFloat({ min: 0 }).withMessage('amountThreshold must be a non-negative number'),
  body('requiredApproverRoleId').isMongoId().withMessage('Valid requiredApproverRoleId required'),
  body('isActive').optional({ values: 'falsy' }).isBoolean(),
];

const updateApprovalMatrixEntry = [
  body('amountThreshold').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('requiredApproverRoleId').optional({ values: 'falsy' }).isMongoId(),
  body('isActive').optional({ values: 'falsy' }).isBoolean(),
];

module.exports = { updateCompany, updateSystem, createApprovalMatrixEntry, updateApprovalMatrixEntry };
