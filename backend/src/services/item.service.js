const itemRepository = require('../repositories/item.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const { generateCode } = require('../helpers/codeGenerator');

async function resolveSku(requestedSku) {
  if (requestedSku) {
    const existing = await itemRepository.findBySku(requestedSku);
    if (existing) throw ApiError.conflict('An item with this SKU already exists');
    return requestedSku.toUpperCase();
  }
  // Auto-generate and retry on the rare collision.
  let sku = generateCode('ITM');
  while (await itemRepository.findBySku(sku)) {
    sku = generateCode('ITM');
  }
  return sku;
}

async function createItem(payload, actorId) {
  const sku = await resolveSku(payload.sku);
  const item = await itemRepository.create({ ...payload, sku, createdBy: actorId, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'item', entityType: 'Item', entityId: item._id, after: item.toObject() });
  return item;
}

function listItems({ page, limit, sort, search, filter }) {
  return itemRepository.findPaginated({
    page,
    limit,
    sort,
    search,
    filter,
    searchFields: ['name', 'sku'],
    populate: 'categoryId unitId taxId',
  });
}

async function getItemById(id) {
  const item = await itemRepository.findById(id, { populate: 'categoryId unitId taxId' });
  if (!item) throw ApiError.notFound('Item not found');
  return item;
}

async function updateItem(id, payload, actorId) {
  const before = await itemRepository.findById(id);
  if (!before) throw ApiError.notFound('Item not found');

  if (payload.sku && payload.sku.toUpperCase() !== before.sku) {
    const existing = await itemRepository.findBySku(payload.sku);
    if (existing) throw ApiError.conflict('An item with this SKU already exists');
  }

  const updated = await itemRepository.updateById(id, { ...payload, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'item', entityType: 'Item', entityId: id, before: before.toObject(), after: updated.toObject() });
  return updated;
}

async function deleteItem(id, actorId) {
  const item = await itemRepository.softDeleteById(id, actorId);
  if (!item) throw ApiError.notFound('Item not found');
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'item', entityType: 'Item', entityId: id });
  return item;
}

module.exports = { createItem, listItems, getItemById, updateItem, deleteItem };
