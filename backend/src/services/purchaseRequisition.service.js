const prnRepository = require('../repositories/purchaseRequisition.repository');
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
    items: payload.items,
    isEmergency: Boolean(payload.isEmergency),
    status: PRN_STATUS.SUBMITTED,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'prn', entityType: 'PurchaseRequisition', entityId: prn._id, after: prn.toObject() });
  return prn;
}

function listRequisitions({ page, limit, sort, search, filter }) {
  return prnRepository.findPaginated({
    page,
    limit,
    sort,
    search,
    searchFields: ['prnNumber'],
    filter,
    populate: 'storeId requestedBy items.itemId',
  });
}

async function getRequisitionById(id) {
  const prn = await prnRepository.findById(id, { populate: 'storeId requestedBy items.itemId' });
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
