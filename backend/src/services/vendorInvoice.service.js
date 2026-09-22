const vendorInvoiceRepository = require('../repositories/vendorInvoice.repository');
const invoiceMatchLogRepository = require('../repositories/invoiceMatchLog.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const vendorRepository = require('../repositories/vendor.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const grnRepository = require('../repositories/grn.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const vendorLedgerService = require('./vendorLedger.service');
const { MATCH_STATUS, HOLD_STATUS, PO_STATUS } = require('../constants/enums');

const PO_STATUSES_INVOICEABLE = [PO_STATUS.RECEIVED, PO_STATUS.PARTIALLY_RECEIVED];

function uniqueIds(ids) {
  const seen = new Map();
  for (const id of ids) seen.set(id.toString(), id);
  return [...seen.values()];
}

// Shared by a clean auto-match and a manual override: advances every PO
// referenced by the invoice's items to "invoiced" — a consolidated invoice
// can reference several — and posts the invoice's full amount as a single
// credit (FMB now owes the vendor that much) to the vendor ledger.
async function advancePoAndPostLedger(invoice, actorId, remarks) {
  const poIds = uniqueIds(invoice.items.map((line) => line.poId));
  for (const poId of poIds) {
    const po = await purchaseOrderRepository.findById(poId);
    if (!po || !PO_STATUSES_INVOICEABLE.includes(po.status)) continue;
    await purchaseOrderRepository.updateById(po._id, { status: PO_STATUS.INVOICED, updatedBy: actorId });
    await poStatusHistoryRepository.record({ poId: po._id, fromStatus: po.status, toStatus: PO_STATUS.INVOICED, changedBy: actorId, remarks });
  }
  await vendorLedgerService.recordEntry({ vendorId: invoice.vendorId, entryType: 'invoice', refType: 'VendorInvoice', refId: invoice._id, credit: invoice.totalAmount });
}

async function createInvoice(payload, actorId) {
  if (!payload.items || payload.items.length === 0) throw ApiError.badRequest('At least one item is required');

  const poIds = uniqueIds(payload.items.map((line) => line.poId));
  const grnIds = uniqueIds(payload.items.map((line) => line.grnId));

  const pos = await Promise.all(poIds.map((poId) => purchaseOrderRepository.findById(poId)));
  const missingPoIndex = pos.findIndex((po) => !po);
  if (missingPoIndex !== -1) throw ApiError.badRequest(`Purchase Order ${poIds[missingPoIndex]} not found`);
  const posById = new Map(pos.map((po) => [po._id.toString(), po]));

  // A consolidated invoice is vendor-scoped — every referenced PO must belong
  // to the vendor this invoice is being raised for.
  const mismatchedVendorPo = pos.find((po) => po.vendorId.toString() !== payload.vendorId);
  if (mismatchedVendorPo) {
    throw ApiError.badRequest(`Purchase Order ${mismatchedVendorPo.poNumber} does not belong to the selected vendor`);
  }

  const grns = await Promise.all(grnIds.map((grnId) => grnRepository.findById(grnId)));
  const missingGrnIndex = grns.findIndex((grn) => !grn);
  if (missingGrnIndex !== -1) throw ApiError.badRequest(`GRN ${grnIds[missingGrnIndex]} not found`);
  const grnsById = new Map(grns.map((grn) => [grn._id.toString(), grn]));

  for (const line of payload.items) {
    const grn = grnsById.get(line.grnId.toString());
    if (grn.poId.toString() !== line.poId.toString()) {
      const po = posById.get(line.poId.toString());
      throw ApiError.badRequest(`GRN ${grn.grnNumber} does not belong to Purchase Order ${po?.poNumber || line.poId}`);
    }
  }

  // A GRN is one physical delivery — it can only ever be billed once, on any
  // invoice. Caught here for a clean 409 rather than letting the model's
  // unique index throw a raw duplicate-key error.
  const existingForGrn = await vendorInvoiceRepository.model.findOne({ 'items.grnId': { $in: grnIds }, isDeleted: false });
  if (existingForGrn) {
    const clash = existingForGrn.items.find((line) => grnIds.some((id) => id.toString() === line.grnId.toString()));
    const clashingGrn = clash && grnsById.get(clash.grnId.toString());
    throw ApiError.conflict(`GRN ${clashingGrn?.grnNumber || clash?.grnId} has already been invoiced (Invoice ${existingForGrn.invoiceNumber}) — a GRN can only be invoiced once`);
  }

  const existingForNumber = await vendorInvoiceRepository.findOne({ vendorId: payload.vendorId, invoiceNumber: payload.invoiceNumber });
  if (existingForNumber) {
    throw ApiError.conflict(`Invoice number ${payload.invoiceNumber} has already been recorded for this vendor`);
  }

  // Recomputed server-side rather than trusted from the client, so totalAmount
  // can never drift from the line items actually stored.
  const items = payload.items.map((line) => ({ ...line, amount: line.quantity * line.rate }));
  const totalAmount = items.reduce((sum, line) => sum + line.amount, 0);

  const invoice = await vendorInvoiceRepository.create({
    invoiceNumber: payload.invoiceNumber,
    vendorId: payload.vendorId,
    items,
    totalAmount,
    fileKey: payload.fileKey,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'invoice', entityType: 'VendorInvoice', entityId: invoice._id, after: invoice.toObject() });
  return invoice;
}

// Normally only safe to edit while still unmatched — once matched/overridden,
// advancePoAndPostLedger has already posted a ledger credit for the
// invoice's totalAmount and advanced the PO status (see matchInvoice below),
// so changing amounts afterward would silently desync the ledger. The one
// exception: if that credit was for ₹0 (e.g. a rate mistakenly entered as
// zero), it was a no-op — nothing to reconcile against — so the invoice can
// still be corrected once, and the corrected amount gets posted as a fresh
// ledger credit below (see the zero-credit branch at the end of this
// function). Editing a second time is blocked again once totalAmount is
// non-zero, since a real credit now exists.
// Which PO/GRN/item a line belongs to is fixed at creation — edit only
// changes quantity/rate (and the amount derived from them), never re-points a
// line at a different PO, GRN, or item.
async function updateInvoice(id, payload, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  const wasZeroValueMatch = invoice.matchStatus !== MATCH_STATUS.PENDING && invoice.totalAmount === 0;
  if (invoice.matchStatus !== MATCH_STATUS.PENDING && !wasZeroValueMatch) {
    throw ApiError.conflict(`Cannot edit an invoice that has already been matched with a non-zero amount (current status: "${invoice.matchStatus}")`);
  }

  if (payload.invoiceNumber && payload.invoiceNumber !== invoice.invoiceNumber) {
    const existingForNumber = await vendorInvoiceRepository.findOne({ vendorId: invoice.vendorId, invoiceNumber: payload.invoiceNumber });
    if (existingForNumber) {
      throw ApiError.conflict(`Invoice number ${payload.invoiceNumber} has already been recorded for this vendor`);
    }
  }

  let items = invoice.items;
  if (payload.items) {
    if (payload.items.length !== invoice.items.length) {
      throw ApiError.badRequest('Cannot add or remove line items when editing an invoice');
    }
    items = payload.items.map((line, i) => {
      const original = invoice.items[i];
      const samePoGrnItem = original.poId.toString() === line.poId?.toString()
        && original.grnId.toString() === line.grnId?.toString()
        && original.itemId.toString() === line.itemId?.toString();
      if (!samePoGrnItem) {
        throw ApiError.badRequest('Cannot change which PO, GRN, or item a line belongs to — only quantity and rate can be edited');
      }
      return { poId: original.poId, grnId: original.grnId, itemId: original.itemId, quantity: line.quantity, rate: line.rate, amount: line.quantity * line.rate };
    });
  }
  const totalAmount = items.reduce((sum, line) => sum + line.amount, 0);

  const updated = await vendorInvoiceRepository.updateById(id, {
    invoiceNumber: payload.invoiceNumber ?? invoice.invoiceNumber,
    items,
    totalAmount,
    fileKey: payload.fileKey ?? invoice.fileKey,
    updatedBy: actorId,
  });

  // The original match posted a ₹0 credit (a no-op) — now that the amount is
  // corrected, post the real credit the vendor is actually owed. The PO was
  // already advanced to "invoiced" at that original match, so nothing to redo there.
  if (wasZeroValueMatch && totalAmount > 0) {
    await vendorLedgerService.recordEntry({ vendorId: invoice.vendorId, entryType: 'invoice', refType: 'VendorInvoice', refId: invoice._id, credit: totalAmount });
  }

  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: invoice.toObject(), after: updated.toObject() });
  return updated;
}

// Search spans three things a user would actually type: the invoice's own
// number (a direct field), the vendor's name, and the PO number — the latter
// two live on referenced documents, not on VendorInvoice itself, so a plain
// $regex on VendorInvoice's own fields (BaseRepository's normal searchFields
// mechanism) can't reach them. Resolve matching vendor/PO ids first, then
// build the $or by hand instead of going through findPaginated's own
// search/searchFields path (passing both would just overwrite this).
async function listInvoices({ page, limit, sort, search, filter }) {
  const combinedFilter = { ...filter };
  if (search) {
    const [vendors, purchaseOrders] = await Promise.all([
      vendorRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 }),
      purchaseOrderRepository.model.find({ poNumber: { $regex: search, $options: 'i' } }, { _id: 1 }),
    ]);
    combinedFilter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { vendorId: { $in: vendors.map((v) => v._id) } },
      { 'items.poId': { $in: purchaseOrders.map((po) => po._id) } },
    ];
  }

  return vendorInvoiceRepository.findPaginated({
    page,
    limit,
    sort,
    filter: combinedFilter,
    populate: 'vendorId items.itemId items.poId items.grnId',
  });
}

async function getInvoiceById(id) {
  const invoice = await vendorInvoiceRepository.findById(id, { populate: 'vendorId items.itemId items.poId items.grnId matchOverriddenBy' });
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  return invoice;
}

// Per client decision, the rate and quantity billed on the invoice are
// always taken as final — they're no longer cross-checked against the PO's
// agreed rate or the GRN's received quantity (rate legitimately moves day to
// day for produce, e.g. tomatoes ordered at ₹20 but invoiced at ₹15 is not an
// error). This intentionally removes the SOP's original three-way value
// comparison; every PO + GRN referenced by the invoice's items is still
// required to exist (the "no payment without a linked PO+GRN+Invoice"
// structural rule is unaffected), but every invoice with valid references
// now auto-matches with no discrepancies.
async function matchInvoice(id, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');

  const poIds = uniqueIds(invoice.items.map((line) => line.poId));
  const grnIds = uniqueIds(invoice.items.map((line) => line.grnId));
  const [pos, grns] = await Promise.all([
    Promise.all(poIds.map((poId) => purchaseOrderRepository.findById(poId))),
    Promise.all(grnIds.map((grnId) => grnRepository.findById(grnId))),
  ]);
  if (pos.some((po) => !po)) throw ApiError.notFound('Purchase Order not found');
  if (grns.some((grn) => !grn)) throw ApiError.notFound('GRN not found');

  const result = MATCH_STATUS.MATCHED;
  const discrepancies = [];

  await invoiceMatchLogRepository.record({ invoiceId: id, poIds, grnIds, discrepancies, matchedBy: actorId, result });

  const updated = await vendorInvoiceRepository.updateById(id, { matchStatus: result, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'invoice', entityType: 'VendorInvoice', entityId: id, before: { matchStatus: invoice.matchStatus }, after: { matchStatus: result, discrepancies } });

  await advancePoAndPostLedger(invoice, actorId, `Invoice ${invoice.invoiceNumber} matched`);

  return { invoice: updated, discrepancies, result };
}

// Lets Purchase manually accept a known match discrepancy with a mandatory
// reason, so a payment voucher can still be raised. Only callable on an
// invoice the automated match actually flagged as mismatched — this is a
// documented exception, not a way to skip matching altogether. Kept for any
// invoice that reached "mismatched" before rate/qty comparison was removed
// from matchInvoice; new invoices can no longer reach that status.
async function overrideMatch(id, reason, actorId) {
  const invoice = await vendorInvoiceRepository.findById(id);
  if (!invoice) throw ApiError.notFound('Vendor Invoice not found');
  if (invoice.matchStatus !== MATCH_STATUS.MISMATCHED) {
    throw ApiError.conflict(`Only a mismatched invoice can have its match overridden (current status: ${invoice.matchStatus})`);
  }

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

  const poIds = uniqueIds(invoice.items.map((line) => line.poId));
  const grnIds = uniqueIds(invoice.items.map((line) => line.grnId));
  await invoiceMatchLogRepository.record({ invoiceId: id, poIds, grnIds, discrepancies, matchedBy: actorId, result: MATCH_STATUS.OVERRIDDEN, reason });
  await advancePoAndPostLedger(invoice, actorId, `Invoice ${invoice.invoiceNumber} match overridden: ${reason}`);
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

module.exports = { createInvoice, updateInvoice, listInvoices, getInvoiceById, matchInvoice, overrideMatch, holdInvoice, releaseInvoice, getMatchHistory };
