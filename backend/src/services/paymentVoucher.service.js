const { mongoose } = require('../config/db');
const paymentVoucherRepository = require('../repositories/paymentVoucher.repository');
const vendorInvoiceRepository = require('../repositories/vendorInvoice.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const userRepository = require('../repositories/user.repository');
const debitNoteRepository = require('../repositories/debitNote.repository');
const vendorLedgerService = require('./vendorLedger.service');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const notificationService = require('./notification.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { APPROVAL_STATUS, MATCH_STATUS, HOLD_STATUS, PO_STATUS, NOTE_STATUS } = require('../constants/enums');
const { STAFF_TYPES, ROLES } = require('../constants/roles');

// An invoice's items each carry their own poId — a consolidated invoice can
// span several POs, so anything that walks "the invoice's PO" must dedupe
// across items rather than assume a single value.
function uniqueIds(ids) {
  const seen = new Map();
  for (const id of ids) seen.set(id.toString(), id);
  return [...seen.values()];
}

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
  if (![MATCH_STATUS.MATCHED, MATCH_STATUS.OVERRIDDEN].includes(invoice.matchStatus)) {
    throw ApiError.conflict('Cannot raise a payment voucher against an invoice that has not been matched (PO + GRN + Invoice)');
  }
  if (invoice.holdStatus === HOLD_STATUS.ON_HOLD) {
    throw ApiError.conflict('Invoice is on hold — release it before raising a payment voucher');
  }

  const alreadyVouchered = await paymentVoucherRepository.sumApprovedForInvoice(payload.invoiceId);
  const remaining = invoice.totalAmount - alreadyVouchered;
  if (remaining <= 0) {
    throw ApiError.conflict('This invoice has no remaining balance — a payment voucher has already been raised for its full amount');
  }
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

  // A consolidated invoice's items can reference several POs — advance every
  // one of them that's still sitting at "invoiced".
  const poIds = uniqueIds(invoice.items.map((line) => line.poId));
  for (const poId of poIds) {
    const po = await purchaseOrderRepository.findById(poId);
    if (po && po.status === PO_STATUS.INVOICED) {
      await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.PAYMENT_PENDING, updatedBy: actorId });
      await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.INVOICED, toStatus: PO_STATUS.PAYMENT_PENDING, changedBy: actorId, remarks: `Payment voucher ${voucherNumber} raised` });
    }
  }

  await auditLogService.record({ userId: actorId, action: 'create', module: 'payment_voucher', entityType: 'PaymentVoucher', entityId: voucher._id, after: voucher.toObject() });
  await notifyApprovers(voucher);
  return voucher;
}

// Invoices a voucher can actually be raised against: matched (or overridden),
// not on hold, and with a remaining unvouchered balance above zero — an
// invoice already fully covered by prior (pending/approved) vouchers must
// disappear from this picker, or the "New Voucher" dropdown fills up with
// invoices that are already done (see createVoucher's own remaining-balance
// guard, which this mirrors).
async function getInvoicesAvailableForVoucher() {
  const invoices = await vendorInvoiceRepository.model
    .find({ isDeleted: false, holdStatus: { $ne: HOLD_STATUS.ON_HOLD }, matchStatus: { $in: [MATCH_STATUS.MATCHED, MATCH_STATUS.OVERRIDDEN] } })
    .populate('vendorId');

  const vouchered = await paymentVoucherRepository.sumApprovedForInvoices(invoices.map((inv) => inv._id));

  return invoices
    .map((invoice) => {
      const remainingAmount = invoice.totalAmount - (vouchered.get(invoice._id.toString()) || 0);
      return { ...invoice.toObject(), remainingAmount };
    })
    .filter((invoice) => invoice.remainingAmount > 0);
}

function listVouchers({ page, limit, sort, filter }) {
  return paymentVoucherRepository.findPaginated({ page, limit, sort, filter, populate: 'invoiceId vendorId approvedBy' });
}

async function getVoucherById(id) {
  const voucher = await paymentVoucherRepository.findById(id, { populate: 'invoiceId vendorId approvedBy' });
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  return voucher;
}

// Reverses a debit note's ledger effect so approving this voucher for the
// full invoice amount doesn't leave the vendor's payable balance short by the
// debited amount — used when Finance decides not to deduct for damage (e.g.
// vendor terms for perishables bill for the full ordered quantity regardless
// of rejected quantity). Must run inside the caller's transaction: the ledger
// reversal and the debit note's status change have to commit or roll back
// together with the voucher approval itself.
async function waiveDebitNote(dn, voucher, actor, { session }) {
  if (dn.status !== NOTE_STATUS.OPEN) {
    throw ApiError.conflict(`Debit Note ${dn.dnNumber} is not open and cannot be waived`);
  }
  if (!dn.vendorId.equals(voucher.vendorId)) {
    throw ApiError.badRequest(`Debit Note ${dn.dnNumber} does not belong to this voucher's vendor`);
  }

  await vendorLedgerService.recordEntry(
    { vendorId: dn.vendorId, entryType: 'debit_note', refType: 'DebitNote', refId: dn._id, credit: dn.totalAmount },
    { session }
  );

  await debitNoteRepository.updateById(
    dn._id,
    { status: NOTE_STATUS.WAIVED, waivedByVoucherId: voucher._id, waivedBy: actor._id, waivedAt: new Date(), updatedBy: actor._id },
    { session }
  );
}

// Defense-in-depth: the payment_voucher:approve permission is already
// restricted to paid-staff roles (see services/helpers/staffTypeGate.js), but
// this re-checks the *acting user's* staffType directly at the point of
// approval, per the SOP's Paid vs Khidmat Gujar restriction.
async function approveVoucher(id, actor, waivedDebitNoteIds = []) {
  if (actor.staffType !== STAFF_TYPES.PAID) {
    throw ApiError.forbidden('Payment approval is restricted to paid staff', 'PAYMENT_APPROVAL_RESTRICTED_TO_PAID_STAFF');
  }

  const voucher = await paymentVoucherRepository.findById(id);
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  if (voucher.approvalStatus !== APPROVAL_STATUS.PENDING) {
    throw ApiError.conflict(`Voucher is already ${voucher.approvalStatus}`);
  }

  let debitNotesToWaive = [];
  if (waivedDebitNoteIds.length > 0) {
    const invoice = await vendorInvoiceRepository.findById(voucher.invoiceId);
    if (!invoice) throw ApiError.notFound('Vendor Invoice not found');

    debitNotesToWaive = await debitNoteRepository.findByIds(waivedDebitNoteIds);
    if (debitNotesToWaive.length !== waivedDebitNoteIds.length) {
      throw ApiError.badRequest('One or more debit notes to waive could not be found');
    }
    const invoicePoGrnPairs = invoice.items.map((line) => `${line.poId}:${line.grnId}`);
    for (const dn of debitNotesToWaive) {
      const belongsToInvoice = dn.poId && dn.grnId && invoicePoGrnPairs.includes(`${dn.poId}:${dn.grnId}`);
      if (!belongsToInvoice) {
        throw ApiError.badRequest(`Debit Note ${dn.dnNumber} is not linked to this voucher's PO/GRN`);
      }
    }
  }

  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      updated = await paymentVoucherRepository.updateById(
        id,
        { approvalStatus: APPROVAL_STATUS.APPROVED, approvedBy: actor._id, approvedAt: new Date(), updatedBy: actor._id },
        { session }
      );

      for (const dn of debitNotesToWaive) {
        await waiveDebitNote(dn, voucher, actor, { session });
      }
    });
  } finally {
    await session.endSession();
  }

  await auditLogService.record({
    userId: actor._id,
    action: 'approve',
    module: 'payment_voucher',
    entityType: 'PaymentVoucher',
    entityId: id,
    before: { approvalStatus: APPROVAL_STATUS.PENDING },
    after: { approvalStatus: APPROVAL_STATUS.APPROVED, waivedDebitNoteIds },
  });
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
  const poIds = invoice ? uniqueIds(invoice.items.map((line) => line.poId)) : [];
  for (const poId of poIds) {
    const po = await purchaseOrderRepository.findById(poId);
    if (po && po.status === PO_STATUS.PAYMENT_PENDING) {
      await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.INVOICED, updatedBy: actorId });
      await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.PAYMENT_PENDING, toStatus: PO_STATUS.INVOICED, changedBy: actorId, remarks: `Payment voucher ${voucher.voucherNumber} rejected: ${reason}` });
    }
  }

  await auditLogService.record({ userId: actorId, action: 'reject', module: 'payment_voucher', entityType: 'PaymentVoucher', entityId: id, before: { approvalStatus: APPROVAL_STATUS.PENDING }, after: { approvalStatus: APPROVAL_STATUS.REJECTED, rejectionReason: reason } });
  await notifyCreator(voucher, 'Payment voucher rejected', `Voucher ${voucher.voucherNumber} was rejected: ${reason}`);
  return updated;
}

module.exports = { createVoucher, listVouchers, getVoucherById, approveVoucher, rejectVoucher, getInvoicesAvailableForVoucher };
