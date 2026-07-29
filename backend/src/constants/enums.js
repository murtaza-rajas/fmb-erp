const PO_STATUS = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  INVOICED: 'invoiced',
  PAYMENT_PENDING: 'payment_pending',
  PAID: 'paid',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
});

const PRN_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  CONVERTED_TO_PO: 'converted_to_po',
  CANCELLED: 'cancelled',
});

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOCKED: 'locked',
});

const MATCH_STATUS = Object.freeze({
  PENDING: 'pending',
  MATCHED: 'matched',
  MISMATCHED: 'mismatched',
});

const HOLD_STATUS = Object.freeze({
  NONE: 'none',
  ON_HOLD: 'on_hold',
  RELEASED: 'released',
});

const APPROVAL_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const NOTIFICATION_CHANNEL = Object.freeze({
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
});

const OTP_PURPOSE = Object.freeze({
  LOGIN: 'login',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFY: 'email_verify',
});

const DEVICE_PLATFORM = Object.freeze({
  ANDROID: 'android',
  IOS: 'ios',
  WEB: 'web',
});

const TAX_TYPE = Object.freeze({
  GST: 'GST',
  VAT: 'VAT',
  CESS: 'CESS',
  NONE: 'NONE',
});

const GRN_QUALITY_STATUS = Object.freeze({
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED_PARTIAL: 'failed_partial',
});

const STOCK_TXN_TYPE = Object.freeze({
  GRN_IN: 'grn_in',
  ISSUE_OUT: 'issue_out',
  ADJUSTMENT: 'adjustment',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  RETURN_OUT: 'return_out',
});

const STOCK_TRANSFER_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
});

const NOTE_STATUS = Object.freeze({
  OPEN: 'open',
  SETTLED: 'settled',
});

const REJECTION_REASON = Object.freeze({
  DAMAGED: 'damaged',
  QUALITY_ISSUE: 'quality_issue',
  OTHER: 'other',
});

const MATERIAL_ISSUE_CATEGORY = Object.freeze({
  FMB: 'fmb',
  SAFAR_THAALI: 'safar_thaali',
  EVENT: 'event',
});

module.exports = {
  PO_STATUS,
  PRN_STATUS,
  USER_STATUS,
  MATCH_STATUS,
  HOLD_STATUS,
  APPROVAL_STATUS,
  NOTIFICATION_CHANNEL,
  OTP_PURPOSE,
  DEVICE_PLATFORM,
  TAX_TYPE,
  GRN_QUALITY_STATUS,
  STOCK_TXN_TYPE,
  STOCK_TRANSFER_STATUS,
  NOTE_STATUS,
  REJECTION_REASON,
  MATERIAL_ISSUE_CATEGORY,
};
