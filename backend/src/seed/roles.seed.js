const { ROLES } = require('../constants/roles');
const { PERMISSIONS: P } = require('../constants/permissions');

// Default permission grants — mirrors docs/architecture/roles-permissions.md.
// Super Admin can adjust non-system permissions per role at runtime; this is
// only the seed data applied on first run / re-seed.
const roleSeedData = [
  {
    name: ROLES.STORE,
    description: 'Stock monitoring, PRN, GRN, quality/quantity check',
    isSystemRole: true,
    permissionKeys: [
      P.PRN_CREATE, P.PRN_READ, P.PRN_UPDATE, P.PRN_CANCEL,
      P.PO_READ,
      P.GRN_CREATE, P.GRN_READ, P.GRN_UPDATE,
      P.STOCK_READ, P.STOCK_ADJUST, P.STOCK_TRANSFER, P.STOCK_RETURN,
      P.MATERIAL_ISSUE_CREATE, P.MATERIAL_ISSUE_READ,
      P.DEBIT_NOTE_CREATE, P.DEBIT_NOTE_READ,
      P.MASTER_READ,
      P.REPORT_READ,
    ],
  },
  {
    name: ROLES.PROCUREMENT_HEAD,
    description: 'Creating and sending the PO to the vendor',
    isSystemRole: true,
    permissionKeys: [
      P.PRN_READ,
      P.PO_CREATE, P.PO_READ, P.PO_UPDATE, P.PO_REVISE, P.PO_CANCEL, P.PO_PRINT, P.PO_EMAIL,
      P.GRN_READ,
      P.STOCK_READ,
      P.DEBIT_NOTE_READ, P.CREDIT_NOTE_READ,
      P.INVOICE_READ,
      P.VENDOR_LEDGER_READ,
      P.MASTER_CREATE, P.MASTER_READ, P.MASTER_UPDATE,
      P.REPORT_READ, P.REPORT_EXPORT,
    ],
  },
  {
    name: ROLES.PURCHASE,
    description: 'Vendor invoice matching against PO and GRN',
    isSystemRole: true,
    permissionKeys: [
      P.PO_READ,
      P.GRN_READ,
      P.STOCK_READ,
      P.DEBIT_NOTE_CREATE, P.DEBIT_NOTE_READ, P.DEBIT_NOTE_UPDATE,
      P.CREDIT_NOTE_CREATE, P.CREDIT_NOTE_READ, P.CREDIT_NOTE_UPDATE,
      P.INVOICE_CREATE, P.INVOICE_READ, P.INVOICE_MATCH, P.INVOICE_HOLD, P.INVOICE_RELEASE, P.INVOICE_OVERRIDE_MATCH,
      P.PAYMENT_VOUCHER_READ,
      P.VENDOR_LEDGER_READ,
      P.MASTER_READ,
      P.REPORT_READ, P.REPORT_EXPORT,
    ],
  },
  {
    name: ROLES.FINANCE_HR,
    description: 'Verifying and approving payment, processing payment, vendor ledger',
    isSystemRole: true,
    permissionKeys: [
      P.PO_READ,
      P.GRN_READ,
      P.STOCK_READ,
      P.DEBIT_NOTE_CREATE, P.DEBIT_NOTE_READ, P.DEBIT_NOTE_UPDATE,
      P.CREDIT_NOTE_CREATE, P.CREDIT_NOTE_READ, P.CREDIT_NOTE_UPDATE,
      P.INVOICE_READ, P.INVOICE_HOLD, P.INVOICE_RELEASE,
      P.PAYMENT_VOUCHER_CREATE, P.PAYMENT_VOUCHER_READ, P.PAYMENT_VOUCHER_APPROVE, P.PAYMENT_VOUCHER_REJECT,
      P.PAYMENT_CREATE, P.PAYMENT_READ,
      P.VENDOR_LEDGER_READ,
      P.MASTER_READ,
      P.REPORT_READ, P.REPORT_EXPORT,
    ],
  },
  {
    name: ROLES.SUPER_ADMIN,
    description: 'Full system access: users, roles, permissions, settings',
    isSystemRole: true,
    permissionKeys: Object.values(P), // everything, including the payment-approval gate
  },
  {
    name: ROLES.AUDITOR,
    description: 'Read-only access to all modules plus audit/activity logs',
    isSystemRole: true,
    permissionKeys: [
      P.USER_READ, P.ROLE_READ,
      P.MASTER_READ,
      P.PRN_READ, P.PO_READ, P.GRN_READ, P.STOCK_READ,
      P.MATERIAL_ISSUE_READ,
      P.DEBIT_NOTE_READ, P.CREDIT_NOTE_READ,
      P.INVOICE_READ,
      P.PAYMENT_VOUCHER_READ, P.PAYMENT_READ,
      P.VENDOR_LEDGER_READ,
      P.REPORT_READ, P.REPORT_EXPORT,
      P.AUDIT_LOG_READ, P.ACTIVITY_LOG_READ,
      P.SETTINGS_READ,
    ],
  },
];

module.exports = roleSeedData;
