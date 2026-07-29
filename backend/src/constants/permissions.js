// module:action convention — mirrors docs/architecture/roles-permissions.md
const PERMISSIONS = Object.freeze({
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',

  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',

  MASTER_CREATE: 'master:create',
  MASTER_READ: 'master:read',
  MASTER_UPDATE: 'master:update',
  MASTER_DELETE: 'master:delete',

  PRN_CREATE: 'prn:create',
  PRN_READ: 'prn:read',
  PRN_UPDATE: 'prn:update',
  PRN_CANCEL: 'prn:cancel',

  PO_CREATE: 'po:create',
  PO_READ: 'po:read',
  PO_UPDATE: 'po:update',
  PO_REVISE: 'po:revise',
  PO_CANCEL: 'po:cancel',
  PO_PRINT: 'po:print',
  PO_EMAIL: 'po:email',

  GRN_CREATE: 'grn:create',
  GRN_READ: 'grn:read',
  GRN_UPDATE: 'grn:update',

  STOCK_READ: 'stock:read',
  STOCK_ADJUST: 'stock:adjust',
  STOCK_TRANSFER: 'stock:transfer',
  STOCK_RETURN: 'stock:return',

  MATERIAL_ISSUE_CREATE: 'material_issue:create',
  MATERIAL_ISSUE_READ: 'material_issue:read',

  DEBIT_NOTE_CREATE: 'debit_note:create',
  DEBIT_NOTE_READ: 'debit_note:read',
  DEBIT_NOTE_UPDATE: 'debit_note:update',
  CREDIT_NOTE_CREATE: 'credit_note:create',
  CREDIT_NOTE_READ: 'credit_note:read',
  CREDIT_NOTE_UPDATE: 'credit_note:update',

  INVOICE_CREATE: 'invoice:create',
  INVOICE_READ: 'invoice:read',
  INVOICE_MATCH: 'invoice:match',
  INVOICE_HOLD: 'invoice:hold',
  INVOICE_RELEASE: 'invoice:release',

  PAYMENT_VOUCHER_CREATE: 'payment_voucher:create',
  PAYMENT_VOUCHER_READ: 'payment_voucher:read',
  PAYMENT_VOUCHER_APPROVE: 'payment_voucher:approve',
  PAYMENT_VOUCHER_REJECT: 'payment_voucher:reject',

  PAYMENT_CREATE: 'payment:create',
  PAYMENT_READ: 'payment:read',

  VENDOR_LEDGER_READ: 'vendor_ledger:read',

  REPORT_READ: 'report:read',
  REPORT_EXPORT: 'report:export',

  AUDIT_LOG_READ: 'audit_log:read',
  ACTIVITY_LOG_READ: 'activity_log:read',

  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
});

// Permissions that gate payment-approval access — a user may only hold these
// if their staffType is 'paid'. See docs/architecture/roles-permissions.md.
const PAYMENT_APPROVAL_GATED_PERMISSIONS = Object.freeze([
  PERMISSIONS.PAYMENT_VOUCHER_APPROVE,
]);

module.exports = { PERMISSIONS, PAYMENT_APPROVAL_GATED_PERMISSIONS };
