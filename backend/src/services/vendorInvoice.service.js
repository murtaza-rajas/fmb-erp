const vendorInvoiceRepository = require('../repositories/vendorInvoice.repository');
const invoiceMatchLogRepository = require('../repositories/invoiceMatchLog.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const grnRepository = require('../repositories/grn.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const vendorLedgerService = require('./vendorLedger.service');
const { MATCH_STATUS, HOLD_STATUS, PO_STATUS } = require('../constants/enums');

const PO_STATUSES_INVOICEABLE = [PO_STATUS.RECEIVED, PO_STATUS.PARTIALLY_RECEIVED];

// Shared by a clean auto-match and a manual override: advances the PO to
// "invoiced" and posts the invoice's full amount as a credit (FMB now owes
// the vendor that much) to the vendor ledger. Only ever runs once per
// invoice, since both callers only reach here the first time matchStatus
// moves off "mismatched"/"pending".
async function advancePoAndPostLedger(po, invoice, actorId, remarks) {
  if (!PO_STATUSES_INVOICEABLE.includes(po.status)) return;
  await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.INVOICED, updatedBy: actorId });
  await poStatusHistoryRepository.record({ poId: po._id, fromStatus: po.status, toStatus: PO_STATUS.INVOICED, changedBy: actorId, remarks });
  await vendorLedgerService.recordEntry({ vendorId: invoice.vendorId, entryType: 'invoice', refType: 'VendorInvoice', refId: invoice._id, credit: invoice.totalAmount });
}

async function createInvoice(payload, actorId) {
  const po = await purchaseOrderRepository.findById(payload.poId);
  if (!po) throw ApiError.badRequest('Purchase Order not found');

  const grn = await grnRepository.findById(payload.grnId);
  if (!grn) throw ApiError.badRequest('GRN not found');
  if (grn.poId.toString() !== payload.poId) {
    throw ApiError.badRequest('GRN does not belong to the given Purchase Order');
  }

  // Recomputed server-side rather than trusted from the client, so totalAmount
  // can never drift from the line items actually stored.
  const items = payload.items.map((line) => ({ ...line, amount: line.quantity * line.rate }));
  const totalAmount = items.reduce((sum, line) => sum + line.amount, 0);

  const invoice = await vendorInvoiceRepository.create({
    invoiceNumber: payload.invoiceNumber,
    vendorId: payload.vendorId,
    poId: payload.poId,
    grnId: payload.grnId,
    items,
    totalAmount,
    fileKey: payload.fileKey,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'invoice', entityType: 'VendorInvoice', entityId: invoice._id, after: invoice.toObject() });
  return invoice;
}

function listInvoices({ page, limit, sort, filter }) {
  return vendorInvoiceRepository.findPaginated({ page, limit, sort, filter, populate: 'vendorId poId grnId items.itemId' });
}

async function getInvoiceById(id) {
  const invoice = await vendorInvoiceRepository.findById(id, { populate: 'vendorId poId grnId items.itemId matchOverriddenBy' });
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  return invoice;
}

// Three-way match, per the SOP: quantity must agree with the GRN (what was
// actually received) and rate must agree with the PO (what was agreed) —
// re-runnable, so a corrected invoice can be re-matched after a mismatch.
async function matchInvoice(id, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');

  const [po, grn] = await Promise.all([
    purchaseOrderRepository.findById(invoice.poId),
    grnRepository.findById(invoice.grnId),
  ]);
  if (!po) throw ApiError.notFound('Purchase Order not found');
  if (!grn) throw ApiError.notFound('GRN not found');

  const poRateByItem = new Map(po.items.map((line) => [line.itemId.toString(), line.rate]));
  const grnQtyByItem = new Map();
  for (const line of grn.items) {
    const key = line.itemId.toString();
    grnQtyByItem.set(key, (grnQtyByItem.get(key) || 0) + line.receivedQty);
  }

  const discrepancies = [];
  for (const line of invoice.items) {
    const key = line.itemId.toString();
    const poRate = poRateByItem.get(key);
    const grnQty = grnQtyByItem.get(key) ?? 0;

    if (poRate === undefined || Number(poRate) !== Number(line.rate)) {
      discrepancies.push({ itemId: line.itemId, field: 'rate', poValue: poRate, invoiceValue: line.rate });
    }
    if (Number(grnQty) !== Number(line.quantity)) {
      discrepancies.push({ itemId: line.itemId, field: 'quantity', grnValue: grnQty, invoiceValue: line.quantity });
    }
  }

  const result = discrepancies.length === 0 ? MATCH_STATUS.MATCHED : MATCH_STATUS.MISMATCHED;

  await invoiceMatchLogRepository.record({ invoiceId: id, poId: invoice.poId, grnId: invoice.grnId, discrepancies, matchedBy: actorId, result });

  const updated = await vendorInvoiceRepository.updateById(id, { matchStatus: result, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: { matchStatus: invoice.matchStatus }, after: { matchStatus: result, discrepancies } });

  if (result === MATCH_STATUS.MATCHED) {
    await advancePoAndPostLedger(po, invoice, actorId, `Invoice ${invoice.invoiceNumber} matched`);
  }

  return { invoice: updated, discrepancies, result };
}

// Lets Purchase manually accept a known PO/GRN-vs-invoice discrepancy (e.g. a
// vendor bills for the full ordered quantity regardless of goods rejected as
// damaged at GRN) with a mandatory reason, so a payment voucher can still be
// raised. Only callable on an invoice the automated match actually flagged —
// this is a documented exception, not a way to skip matching altogether.
async function overrideMatch(id, reason, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  if (invoice.matchStatus !== MATCH_STATUS.MISMATCHED) {
    throw ApiError.conflict(`Only a mismatched invoice can have its match overridden (current status: ${invoice.matchStatus})`);
  }

  const po = await purchaseOrderRepository.findById(invoice.poId);
  if (!po) throw ApiError.notFound('Purchase Order not found');

  // Carry the original discrepancies onto the override log entry too, so the
  // "why we still paid despite a mismatch" record shows both the reason and
  // exactly what didn't line up — not just the reason on its own.
  const priorHistory = await invoiceMatchLogRepository.findForInvoice(id);
  const discrepancies = priorHistory[0]?.discrepancies ?? [];

  const updated = await vendorInvoiceRepository.updateById(id, {
    matchStatus: MATCH_STATUS.OVERRIDDEN,
    matchOverrideReason: reason,
    matchOverriddenBy: actorId,
    matchOverriddenAt: new Date(),
    updatedBy: actorId,
  });

  await invoiceMatchLogRepository.record({ invoiceId: id, poId: invoice.poId, grnId: invoice.grnId, discrepancies, matchedBy: actorId, result: MATCH_STATUS.OVERRIDDEN, reason });
  await advancePoAndPostLedger(po, invoice, actorId, `Invoice ${invoice.invoiceNumber} match overridden: ${reason}`);
  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: { matchStatus: MATCH_STATUS.MISMATCHED }, after: { matchStatus: MATCH_STATUS.OVERRIDDEN, matchOverrideReason: reason } });
  return updated;
}

async function holdInvoice(id, reason, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');

  const updated = await vendorInvoiceRepository.updateById(id, { holdStatus: HOLD_STATUS.ON_HOLD, holdReason: reason, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: { holdStatus: invoice.holdStatus }, after: { holdStatus: HOLD_STATUS.ON_HOLD, holdReason: reason } });
  return updated;
}

async function releaseInvoice(id, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  if (invoice.holdStatus !== HOLD_STATUS.ON_HOLD) {
    throw ApiError.conflict('Invoice is not currently on hold');
  }

  const updated = await vendorInvoiceRepository.updateById(id, { holdStatus: HOLD_STATUS.RELEASED, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: { holdStatus: HOLD_STATUS.ON_HOLD }, after: { holdStatus: HOLD_STATUS.RELEASED } });
  return updated;
}

async function getMatchHistory(id) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  return invoiceMatchLogRepository.findForInvoice(id);
}

module.exports = { createInvoice, listInvoices, getInvoiceById, matchInvoice, overrideMatch, holdInvoice, releaseInvoice, getMatchHistory };
