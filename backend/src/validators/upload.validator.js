const { body, query } = require('express-validator');

const presign = [
  body('module').isIn(['invoice', 'grn', 'debit_note']).withMessage('Invalid module'),
  body('fileName').notEmpty().withMessage('fileName is required'),
  body('contentType').isIn(['image/jpeg', 'image/png', 'application/pdf']).withMessage('Unsupported contentType'),
];

const viewUrl = [query('fileKey').notEmpty().withMessage('fileKey is required')];

module.exports = { presign, viewUrl };
