const { mongoose } = require('../config/db');
const paymentRepository = require('../repositories/payment.repository');
const paymentVoucherRepository = require('../repositories/paymentVoucher.repository');
const vendorInvoiceRepository = require('../repositories/vendorInvoice.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const vendorLedgerService = require('./vendorLedger.service');
const auditLogService = require('./auditLog.service');
const mailService = require('./mail.service');
const { generatePaymentAdvicePdf } = require('./pdf/paymentAdvice.pdf');
const ApiError = require('../utils/ApiError');
const { APPROVAL_STATUS, PO_STATUS } = require('../constants/enums');

// Processing the payment is the SOP's final step: money moves, the PO is
// marked paid and closed (both transitions recorded, in the same
// transaction as the Payment row and the vendor-ledger debit entry).
async function processPayment(voucherId, payload, actorId) {
  const voucher = await paymentVoucherRepository.findById(voucherId);
  if (!voucher) throw ApiError.notFound('Payment Voucher not found');
  if (voucher.approvalStatus !== APPROVAL_STATUS.APPROVED) {
    throw ApiError.conflict('Only an approved voucher can be paid');
  }

  const existing = await paymentRepository.findByVoucherId(voucherId);
  if (existing) throw ApiError.conflict('This voucher has already been paid');

  const invoice = await vendorInvoiceRepository.findById(voucher.invoiceId);
  const po = invoice && (await purchaseOrderRepository.findById(invoice.poId));

  const session = await mongoose.startSession();
  try {
    let payment;
    await session.withTransaction(async () => {
      payment = await paymentRepository.create(
        {
          voucherId,
          transactionRef: payload.transactionRef,
          paidAmount: voucher.amount,
          paidAt: new Date(),
          paidBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      await vendorLedgerService.recordEntry(
        { vendorId: voucher.vendorId, entryType: 'payment', refType: 'Payment', refId: payment._id, debit: voucher.amount },
        { session }
      );

      if (po && po.status === PO_STATUS.PAYMENT_PENDING) {
        await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.PAID, updatedBy: actorId }, { session });
        await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.PAYMENT_PENDING, toStatus: PO_STATUS.PAID, changedBy: actorId, remarks: `Payment ${payment._id} processed` }, { session });

        await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.CLOSED, updatedBy: actorId }, { session });
        await poStatusHistoryRepository.record({ poId: po._id, fromStatus: PO_STATUS.PAID, toStatus: PO_STATUS.CLOSED, changedBy: actorId, remarks: 'PO closed after payment' }, { session });
      }
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'payment', entityType: 'Payment', entityId: payment._id, after: payment.toObject() });

    // Payment advice generation/email is a side effect, not part of the
    // financial transaction's correctness — failures here shouldn't roll
    // back money already recorded as paid.
    await sendAdvice(payment._id, voucher.vendorId).catch(() => {});

    return getPaymentById(payment._id);
  } finally {
    await session.endSession();
  }
}

async function sendAdvice(paymentId) {
  const populated = await getPaymentById(paymentId);
  const vendor = populated.voucherId.vendorId;
  if (!vendor?.email) return;

  const pdfBuffer = await generatePaymentAdvicePdf(populated);
  await mailService.sendPaymentAdviceEmail(vendor.email, populated.voucherId.voucherNumber, pdfBuffer);
  await paymentRepository.updateById(paymentId, { paymentAdviceSentAt: new Date() });
}

function listPayments({ page, limit, sort, filter }) {
  return paymentRepository.findPaginated({ page, limit, sort, filter, populate: 'voucherId paidBy' });
}

async function getPaymentById(id) {
  const payment = await paymentRepository.findById(id, {
    populate: { path: 'voucherId', populate: { path: 'vendorId' } },
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
}

async function generateAdvicePdf(id) {
  const payment = await getPaymentById(id);
  return generatePaymentAdvicePdf(payment);
}

module.exports = { processPayment, listPayments, getPaymentById, generateAdvicePdf };
