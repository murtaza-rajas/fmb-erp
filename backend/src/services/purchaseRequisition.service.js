const prnRepository = require('../repositories/purchaseRequisition.repository');
const itemRepository = require('../repositories/item.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { PRN_STATUS } = require('../constants/enums');

async function createRequisition(payload, actorId) {
  const prnNumber = await generateDocumentNumber('PRN');

  const prn = await prnRepository.create({
    prnNumber,
    storeId: payload.storeId,
    requestedBy: actorId,
    requisitionDate: payload.requisitionDate || new Date(),
    items: payload.items,
    isEmergency: Boolean(payload.isEmergency),
    status: PRN_STATUS.SUBMITTED,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'prn', entityType: 'PurchaseRequisition', entityId: prn._id, after: prn.toObject() });
  return prn;
}

// Search spans the PRN's own number plus the items on it — items.itemId is a
// reference, not a string, so a plain regex searchFields entry can't reach
// it; resolve matching Item ids first (same resolve-to-ids pattern used for
// invoice/GRN search) and fold them into the $or by hand.
async function listRequisitions({ page, limit, sort, search, filter = {} }) {
  const { from, to, ...rest } = filter;
  const dateFilter = {};
  if (from || to) {
    dateFilter.requisitionDate = {};
    if (from) dateFilter.requisitionDate.$gte = new Date(from);
    if (to) dateFilter.requisitionDate.$lte = new Date(to);
  }

  const combinedFilter = { ...rest, ...dateFilter };
  if (search) {
    const matchingItems = await itemRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 });
    combinedFilter.$or = [
      { prnNumber: { $regex: search, $options: 'i' } },
      { 'items.itemId': { $in: matchingItems.map((i) => i._id) } },
    ];
  }

  return prnRepository.findPaginated({
    page,
    limit,
    sort,
    filter: combinedFilter,
    populate: 'storeId requestedBy items.itemId',
  });
}

async function getRequisitionById(id) {
  const prn = await prnRepository.findById(id, {
    populate: ['storeId', 'requestedBy', { path: 'items.itemId', populate: 'unitId' }],
  });
  if (!prn) throw ApiError.notFound('Purchase Requisition not found');
  return prn;
}

// Only editable while still submitted — once a PO has been created against
// it (converted_to_po) the PRN is historical record, and a cancelled PRN
// stays cancelled.
async function updateRequisition(id, payload, actorId) {
  const before = await prnRepository.findById(id);
  if (!before) throw ApiError.notFound('Purchase Requisition not found');
  if (before.status !== PRN_STATUS.SUBMITTED) {
    throw ApiError.conflict(`Cannot edit a requisition in status "${before.status}"`);
  }

  const updated = await prnRepository.updateById(id, {
    storeId: payload.storeId ?? before.storeId,
    requisitionDate: payload.requisitionDate ?? before.requisitionDate,
    items: payload.items ?? before.items,
    isEmergency: payload.isEmergency ?? before.isEmergency,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'update', module: 'prn', entityType: 'PurchaseRequisition', entityId: id, before: before.toObject(), after: updated.toObject() });
  return updated;
}

async function cancelRequisition(id, actorId) {
  const prn = await prnRepository.findById(id);
  if (!prn) throw ApiError.notFound('Purchase Requisition not found');
  if (prn.status !== PRN_STATUS.SUBMITTED) {
    throw ApiError.conflict(`Cannot cancel a requisition in status "${prn.status}"`);
  }

  const updated = await prnRepository.updateById(id, { status: PRN_STATUS.CANCELLED, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'prn', entityType: 'PurchaseRequisition', entityId: id, before: { status: prn.status }, after: { status: PRN_STATUS.CANCELLED } });
  return updated;
}

// Called by purchaseOrder.service.js when a PO is created against this PRN.
// Throws if the PRN isn't in a convertible state, so PurchaseOrderService
// can rely on this as the single source of truth for that business rule.
async function markConverted(id, actorId, { session } = {}) {
  const prn = await prnRepository.findById(id, { session });
  if (!prn) throw ApiError.notFound('Purchase Requisition not found');
  if (prn.status !== PRN_STATUS.SUBMITTED) {
    throw ApiError.conflict(`Requisition ${prn.prnNumber} is not in a convertible state (status "${prn.status}")`);
  }
  return prnRepository.updateById(id, { status: PRN_STATUS.CONVERTED_TO_PO, updatedBy: actorId }, { session });
}

module.exports = {
  createRequisition,
  listRequisitions,
  getRequisitionById,
  updateRequisition,
  cancelRequisition,
  markConverted,
};
