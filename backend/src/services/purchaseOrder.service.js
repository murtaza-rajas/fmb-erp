const { mongoose } = require('../config/db');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const purchaseRequisitionService = require('./purchaseRequisition.service');
const itemRepository = require('../repositories/item.repository');
const vendorItemRateRepository = require('../repositories/vendorItemRate.repository');
const vendorRepository = require('../repositories/vendor.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const mailService = require('./mail.service');
const { generatePurchaseOrderPdf } = require('./pdf/purchaseOrder.pdf');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { PO_STATUS } = require('../constants/enums');

const REVISABLE_STATUSES = [PO_STATUS.DRAFT, PO_STATUS.ISSUED];
const CANCELLABLE_STATUSES = [PO_STATUS.DRAFT, PO_STATUS.ISSUED];

// Resolves a line's rate/tax when the caller didn't supply one: prefer the
// vendor's current quoted rate for that item, falling back to the item's
// standard rate. Neither existing means the line genuinely can't be priced.
async function resolveLine(vendorId, line) {
  const item = await itemRepository.findById(line.itemId);
  if (!item) throw ApiError.badRequest(`Item ${line.itemId} not found`);

  let rate = line.rate;
  if (rate === undefined || rate === null) {
    const vendorRate = await vendorItemRateRepository.findCurrentRate(vendorId, line.itemId);
    rate = vendorRate?.rate ?? item.standardRate;
  }
  if (rate === undefined || rate === null) {
    throw ApiError.badRequest(`No rate available for item "${item.name}" — supply one explicitly`);
  }

  const taxId = line.taxId ?? item.taxId ?? undefined;
  const amount = Number(rate) * Number(line.quantity);

  return { itemId: line.itemId, quantity: line.quantity, rate: Number(rate), taxId, amount };
}

// Creating a PO converts its PRN in the same transaction — a PO must never
// exist referencing a PRN that failed to transition, and vice versa.
async function createPurchaseOrder(payload, actorId) {
  const vendor = await vendorRepository.findById(payload.vendorId);
  if (!vendor) throw ApiError.badRequest('Vendor not found');

  const resolvedItems = await Promise.all(payload.items.map((line) => resolveLine(payload.vendorId, line)));
  const totalAmount = resolvedItems.reduce((sum, line) => sum + line.amount, 0);

  const session = await mongoose.startSession();
  try {
    let po;
    await session.withTransaction(async () => {
      await purchaseRequisitionService.markConverted(payload.prnId, actorId, { session });

      const poNumber = await generateDocumentNumber('PO', { session });

      po = await purchaseOrderRepository.create(
        {
          poNumber,
          prnId: payload.prnId,
          vendorId: payload.vendorId,
          items: resolvedItems,
          totalAmount,
          status: PO_STATUS.DRAFT,
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      await poStatusHistoryRepository.record(
        { poId: po._id, fromStatus: null, toStatus: PO_STATUS.DRAFT, changedBy: actorId },
        { session }
      );
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'po', entityType: 'PurchaseOrder', entityId: po._id, after: po.toObject() });
    return po;
  } finally {
    await session.endSession();
  }
}

// Search spans the PO's own number, its vendor's name, and the items on
// it — the latter two are references, not strings, so resolving matching
// ids first (same pattern as invoice/GRN/PRN search) is required before they
// can be folded into the $or.
async function listPurchaseOrders({ page, limit, sort, search, filter }) {
  const combinedFilter = { ...filter };
  if (search) {
    const [vendors, matchingItems] = await Promise.all([
      vendorRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 }),
      itemRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 }),
    ]);
    combinedFilter.$or = [
      { poNumber: { $regex: search, $options: 'i' } },
      { vendorId: { $in: vendors.map((v) => v._id) } },
      { 'items.itemId': { $in: matchingItems.map((i) => i._id) } },
    ];
  }

  return purchaseOrderRepository.findPaginated({
    page,
    limit,
    sort,
    filter: combinedFilter,
    populate: 'vendorId prnId items.itemId',
  });
}

async function getPurchaseOrderById(id) {
  const po = await purchaseOrderRepository.findById(id, {
    populate: ['vendorId', 'prnId', { path: 'items.itemId', populate: 'unitId' }, 'items.taxId'],
  });
  if (!po) throw ApiError.notFound('Purchase Order not found');
  return po;
}

async function transitionStatus(id, toStatus, actorId, remarks) {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw ApiError.notFound('Purchase Order not found');

  const fromStatus = po.status;
  const updated = await purchaseOrderRepository.updateById(id, { status: toStatus, updatedBy: actorId });
  await poStatusHistoryRepository.record({ poId: id, fromStatus, toStatus, changedBy: actorId, remarks });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'po', entityType: 'PurchaseOrder', entityId: id, before: { status: fromStatus }, after: { status: toStatus } });
  return updated;
}

async function issuePurchaseOrder(id, actorId) {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw ApiError.notFound('Purchase Order not found');
  if (po.status !== PO_STATUS.DRAFT) {
    throw ApiError.conflict(`Only a draft PO can be issued (current status "${po.status}")`);
  }

  const updated = await purchaseOrderRepository.updateById(id, { status: PO_STATUS.ISSUED, issuedBy: actorId, issuedAt: new Date(), updatedBy: actorId });
  await poStatusHistoryRepository.record({ poId: id, fromStatus: PO_STATUS.DRAFT, toStatus: PO_STATUS.ISSUED, changedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'po', entityType: 'PurchaseOrder', entityId: id, before: { status: PO_STATUS.DRAFT }, after: { status: PO_STATUS.ISSUED } });
  return updated;
}

async function cancelPurchaseOrder(id, reason, actorId) {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw ApiError.notFound('Purchase Order not found');
  if (!CANCELLABLE_STATUSES.includes(po.status)) {
    throw ApiError.conflict(`Cannot cancel a PO in status "${po.status}"`);
  }
  return transitionStatus(id, PO_STATUS.CANCELLED, actorId, reason);
}

// A revision is a new PO document (new number, revisionNumber + 1) linked to
// the original via parentPoId; the original is cancelled as "superseded"
// rather than mutated in place, preserving history.
async function revisePurchaseOrder(id, payload, actorId) {
  const original = await purchaseOrderRepository.findById(id);
  if (!original) throw ApiError.notFound('Purchase Order not found');
  if (!REVISABLE_STATUSES.includes(original.status)) {
    throw ApiError.conflict(`Cannot revise a PO in status "${original.status}"`);
  }

  const resolvedItems = await Promise.all((payload.items ?? original.items).map((line) => resolveLine(original.vendorId, line)));
  const totalAmount = resolvedItems.reduce((sum, line) => sum + line.amount, 0);

  const session = await mongoose.startSession();
  try {
    let revised;
    await session.withTransaction(async () => {
      const poNumber = await generateDocumentNumber('PO', { session });

      revised = await purchaseOrderRepository.create(
        {
          poNumber,
          prnId: original.prnId,
          vendorId: original.vendorId,
          items: resolvedItems,
          totalAmount,
          status: PO_STATUS.DRAFT,
          revisionNumber: original.revisionNumber + 1,
          parentPoId: original._id,
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      await poStatusHistoryRepository.record({ poId: revised._id, fromStatus: null, toStatus: PO_STATUS.DRAFT, changedBy: actorId, remarks: `Revision of ${original.poNumber}` }, { session });

      await purchaseOrderRepository.updateById(original._id, { status: PO_STATUS.CANCELLED, updatedBy: actorId }, { session });
      await poStatusHistoryRepository.record({ poId: original._id, fromStatus: original.status, toStatus: PO_STATUS.CANCELLED, changedBy: actorId, remarks: `Superseded by revision ${poNumber}` }, { session });
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'po', entityType: 'PurchaseOrder', entityId: revised._id, after: revised.toObject() });
    return revised;
  } finally {
    await session.endSession();
  }
}

async function getTimeline(id) {
  const po = await purchaseOrderRepository.findById(id);
  if (!po) throw ApiError.notFound('Purchase Order not found');
  return poStatusHistoryRepository.findForPo(id);
}

async function generatePdf(id) {
  const po = await getPurchaseOrderById(id);
  return generatePurchaseOrderPdf(po);
}

async function sendPoEmail(id, actorId) {
  const po = await getPurchaseOrderById(id);
  if (!po.vendorId.email) {
    throw ApiError.badRequest('Vendor has no email address on file');
  }

  const pdfBuffer = await generatePurchaseOrderPdf(po);
  await mailService.sendPurchaseOrderEmail(po.vendorId.email, po.poNumber, pdfBuffer);

  const updated = await purchaseOrderRepository.updateById(id, { emailSentAt: new Date(), updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'po', entityType: 'PurchaseOrder', entityId: id, after: { emailSentAt: updated.emailSentAt } });
  return updated;
}

module.exports = {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrderById,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  revisePurchaseOrder,
  getTimeline,
  generatePdf,
  sendPoEmail,
};
