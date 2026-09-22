const { body } = require('express-validator');
const { REJECTION_REASON } = require('../constants/enums');

const create = [
  body('poId').isMongoId().withMessage('Valid poId required'),
  body('storeId').isMongoId().withMessage('Valid storeId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemId').isMongoId().withMessage('Valid itemId required'),
  body('items.*.receivedQty').isFloat({ min: 0 }).withMessage('receivedQty must be a non-negative number'),
  body('items.*.rejectedQty').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('items.*.rejectionReason').optional({ values: 'falsy' }).isIn(Object.values(REJECTION_REASON)),
  body('items.*.remarks').optional({ values: 'falsy' }).isString(),
  body('cartingCharges').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('cartingCharges must be a non-negative number'),
  body('attachments').optional({ values: 'falsy' }).isArray(),
  body('attachments.*.fileKey').optional({ values: 'falsy' }).isString(),
  body('attachments.*.contentType').optional({ values: 'falsy' }).isString(),
];

module.exports = { create };
