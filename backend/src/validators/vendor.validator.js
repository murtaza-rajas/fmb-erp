const { body, param } = require('express-validator');

const create = [
  body('name').notEmpty().withMessage('Name is required'),
  body('contactPerson').optional({ values: 'falsy' }).isString(),
  body('phone').optional({ values: 'falsy' }).isString(),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('paymentTermsId').optional({ values: 'falsy' }).isMongoId(),
  body('itemsSupplied').optional({ values: 'falsy' }).isArray(),
  body('itemsSupplied.*').optional({ values: 'falsy' }).isMongoId(),
  body('gstNumber').optional({ values: 'falsy' }).isString(),
  body('fssaiNumber').optional({ values: 'falsy' }).isString(),
  body('gstCertificateFileKey').optional({ values: 'falsy' }).isString(),
  body('fssaiCertificateFileKey').optional({ values: 'falsy' }).isString(),
];

const update = [
  body('name').optional({ values: 'falsy' }).notEmpty(),
  body('paymentTermsId').optional({ values: 'falsy' }).isMongoId(),
  body('gstNumber').optional({ values: 'falsy' }).isString(),
  body('fssaiNumber').optional({ values: 'falsy' }).isString(),
  body('gstCertificateFileKey').optional({ values: 'falsy' }).isString(),
  body('fssaiCertificateFileKey').optional({ values: 'falsy' }).isString(),
];

const addBankAccount = [
  param('id').isMongoId(),
  body('accountHolderName').notEmpty(),
  body('bankName').notEmpty(),
  body('accountNumber').notEmpty(),
  body('ifsc').notEmpty(),
  body('isPrimary').optional({ values: 'falsy' }).isBoolean(),
];

const addItemRate = [
  param('id').isMongoId(),
  body('itemId').isMongoId().withMessage('Valid itemId required'),
  body('rate').isFloat({ min: 0 }).withMessage('rate must be a non-negative number'),
  body('effectiveFrom').optional({ values: 'falsy' }).isISO8601(),
  body('quotationRef').optional({ values: 'falsy' }).isString(),
];

module.exports = { create, update, addBankAccount, addItemRate };
