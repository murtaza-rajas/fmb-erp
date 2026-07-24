const advancePaymentRepository = require('../repositories/advancePayment.repository');
const vendorLedgerService = require('./vendorLedger.service');
const auditLogService = require('./auditLog.service');
const ApiError = require('../utils/ApiError');

// An advance is money already paid out ahead of any invoice — it reduces
// FMB's future payable to the vendor immediately, so it posts a debit entry
// at creation time (see vendorLedger.service.js balance direction).
async function createAdvancePayment(payload, actorId) {
  const advance = await advancePaymentRepository.create({
    vendorId: payload.vendorId,
    amount: payload.amount,
    paidAt: payload.paidAt || new Date(),
    balanceRemaining: payload.amount,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await vendorLedgerService.recordEntry({ vendorId: payload.vendorId, entryType: 'advance', refType: 'AdvancePayment', refId: advance._id, debit: payload.amount });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'advance_payment', entityType: 'AdvancePayment', entityId: advance._id, after: advance.toObject() });
  return advance;
}

function listAdvancePayments({ page, limit, sort, filter }) {
  return advancePaymentRepository.findPaginated({ page, limit, sort, filter, populate: 'vendorId adjustedAgainstInvoiceId' });
}

// Applies part or all of an advance's remaining balance against a specific
// invoice — a manual reconciliation step for Finance, not an automatic one,
// since which invoice an advance offsets is a judgment call.
async function adjustAdvancePayment(id, { invoiceId, amount }, actorId) {
  const advance = await advancePaymentRepository.findById(id);
  if (!advance) throw ApiError.notFound('Advance Payment not found');
  if (amount > advance.balanceRemaining) {
    throw ApiError.badRequest(`Adjustment amount (${amount}) exceeds the remaining advance balance (${advance.balanceRemaining})`);
  }

  const updated = await advancePaymentRepository.updateById(id, {
    balanceRemaining: advance.balanceRemaining - amount,
    adjustedAgainstInvoiceId: invoiceId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'update', module: 'advance_payment', entityType: 'AdvancePayment', entityId: id, before: { balanceRemaining: advance.balanceRemaining }, after: { balanceRemaining: updated.balanceRemaining, adjustedAgainstInvoiceId: invoiceId } });
  return updated;
}

module.exports = { createAdvancePayment, listAdvancePayments, adjustAdvancePayment };
