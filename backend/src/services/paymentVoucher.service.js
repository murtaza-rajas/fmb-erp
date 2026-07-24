const paymentVoucherRepository = require('../repositories/paymentVoucher.repository');
const vendorInvoiceRepository = require('../repositories/vendorInvoice.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const notificationService = require('./notification.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { APPROVAL_STATUS, MATCH_STATUS, HOLD_STATUS, PO_STATUS } = require('../constants/enums');
const { STAFF_TYPES, ROLES } = require('../constants/roles');

// Notification failures must never block the underlying financial action —
// dispatch is fire-and-forget from the caller's perspective.
async function notifyApprovers(voucher) {
  const approvers = await userRepository.findActiveByRoleNames([ROLES.FINANCE_HR, ROLES.SUPER_ADMIN]);
  await Promise.all(
    approvers.map((user) =>
      notificationService
        .dispatch({
          userId: user._id,
          type: 'payment_voucher_pending',
          title: 'Payment voucher awaiting approval',
          message: `Voucher ${voucher.voucherNumber} for ${voucher.amount} is awaiting your approval.`,
          link: `/finance/payment-vouchers/${voucher._id}`,
        })
        .catch(() => {})
    )
  );
}

function notifyCreator(voucher, title, message) {
  return notificationService
    .dispatch({ userId: voucher.createdBy, type: 'payment_voucher_status', title, message, link: `/finance/payment-vouchers/${voucher._id}` })
    .catch(() => {});
}

// The SOP's core guarantee: no payment without a matched PO + GRN + Invoice.
// A voucher literally cannot be created against an invoice that hasn't
// cleared the three-way match, or that's on hold pending resolution.
async function createVoucher(payload, actorId) {
  const invoice = await vendorInvoiceRepository.findById(payload.invoiceId);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  if (invoice.matchStatus !== MATCH_STATUS.MATCHED) {
    throw ApiError.conflict('Cannot raise a payment voucher against an invoice that has not been matched (PO + GRN + Invoice)');
  }
  if (invoice.holdStatus === HOLD_STATUS.ON_HOLD) {
    throw ApiError.conflict('Invoice is on hold — release it before raising a payment voucher');
  }

  const alreadyVouchered = await paymentVoucherRepository.sumApprovedForInvoice(payload.invoiceId);
  const remaining = invoice.totalAmount - alreadyVouchered;
  const amount = payload.amount ?? remaining;

  if (amount > remaining) {
    throw ApiError.badRequest(`Requested amount (${amount}) exceeds the remaining unvouchered invoice balance (${remaining})`);
  }

  const voucherNumber = await generateDocumentNumber('PV');
  const voucher = await paymentVoucherRepository.create({
    voucherNumber,
    invoiceId: invoice._id,
    vendorId: invoice.vendorId,
    amount,
    paymentMode: payload.paymentMode,
    createdBy: actorId,
    updatedBy: actorId,
  });

  const po = await purchaseOrderRepository.findById(invoice.poId);
  if (po && po.status === PO_STATUS.INVOICED) {
    await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.PAYMENT_PENDING, updatedBy: actorId });
    await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.INVOICED, toStatus: PO_STATUS.PAYMENT_PENDING, changedBy: actorId, remarks: `Payment voucher ${voucherNumber} raised` });
  }

  await auditLogService.record({ userId: actorId, action: 'create', module: 'payment_voucher', entityType: 'PaymentVoucher', entityId: voucher._id, after: voucher.toObject() });
  await notifyApprovers(voucher);
  return voucher;
}

function listVouchers({ page, limit, sort, filter }) {
  return paymentVoucherRepository.findPaginated({ page, limit, sort, filter, populate: 'invoiceId vendorId approvedBy' });
}

async function getVoucherById(id) {
  const voucher = await paymentVoucherRepository.findById(id, { populate: 'invoiceId vendorId approvedBy' });
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  return voucher;
}

// Defense-in-depth: the payment_voucher:approve permission is already
// restricted to paid-staff roles (see services/helpers/staffTypeGate.js), but
// this re-checks the *acting user's* staffType directly at the point of
// approval, per the SOP's Paid vs Khidmat Gujar restriction.
async function approveVoucher(id, actor) {
  if (actor.staffType !== STAFF_TYPES.PAID) {
    throw ApiError.forbidden('Payment approval is restricted to paid staff', 'PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF');
  }

  const voucher = await paymentVoucherRepository.findById(id);
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  if (voucher.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw ApiError.conflict(`Voucher is already ${voucher.approvalStatus}`);
  }

  const updated = await paymentVoucherRepository.updateById(id, {
    approvalStatus: APPROVAL_STATUS.APPROVED,
    approvedBy: actor._id,
    approvedAt: new Date(),
    updatedBy: actor._id,
  });

  await auditLogService.record({ userId: actor._id, action: 'approve', module: 'payment_voucher', entityType: 'PaymentVoucher', entityId: id, before: { approvalStatus: APPROVAL_STATUS.PENDING }, after: { approvalStatus: APPROVAL_STATUS.APPROVED } });
  await notifyCreator(voucher, 'Payment voucher approved', `Voucher ${voucher.voucherNumber} has been approved.`);
  return updated;
}

async function rejectVoucher(id, reason, actorId) {
  const voucher = await paymentVoucherRepository.findById(id);
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  if (voucher.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw ApiError.conflict(`Voucher is already ${voucher.approvalStatus}`);
  }

  const updated = await paymentVoucherRepository.updateById(id, {
    approvalStatus: APPROVAL_STATUS.REJECTED,
    rejectionReason: reason,
    updatedBy: actorId,
  });

  const invoice = await vendorInvoiceRepository.findById(voucher.invoiceId);
  const po = invoice && (await purchaseOrderRepository.findById(invoice.poId));
  if (po && po.status === PO_STATUS.PAYMENT_PENDING) {
    await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.INVOICED, updatedBy: actorId });
    await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.PAYMENT_PENDING, toStatus: PO_STATUS.INVOICED, changedBy: actorId, remarks: `Payment voucher ${voucher.voucherNumber} rejected: ${reason}` });
  }

  await auditLogService.record({ userId: actorId, action: 'reject', module: 'payment_voucher', entityType: 'PaymentVoucher', entityId: id, before: { approvalStatus: APPROVAL_STATUS.PENDING }, after: { approvalStatus: APPROVAL_STATUS.REJECTED, rejectionReason: reason } });
  await notifyCreator(voucher, 'Payment voucher rejected', `Voucher ${voucher.voucherNumber} was rejected: ${reason}`);
  return updated;
}

module.exports = { createVoucher, listVouchers, getVoucherById, approveVoucher, rejectVoucher };
