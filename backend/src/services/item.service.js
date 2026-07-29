const itemRepository = require('../repositories/item.repository');
const Item = require('../models/Item.model');
const Category = require('../models/Category.model');
const Unit = require('../models/Unit.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const { generateCode } = require('../helpers/codeGenerator');
const { mongoose } = require('../config/db');
const { parseItemWorkbook } = require('../utils/excelImport/parseItemWorkbook');
const { PO_STATUS } = require('../constants/enums');

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

// Deleting an item that's still awaiting receipt on a PO leaves that PO's
// GRN form unable to resolve the line item (populate silently returns null),
// which blocks GRN recording with no visible error — block the delete while
// the item could still be received against (mirrors grn.service.js's own
// RECEIVABLE_PO_STATUSES gate on the same two statuses).
async function deleteItem(id, actorId) {
  const openPo = await PurchaseOrder.findOne({
    'items.itemId': id,
    isDeleted: false,
    status: { $in: [PO_STATUS.ISSUED, PO_STATUS.PARTIALLY_RECEIVED] },
  });
  if (openPo) {
    throw ApiError.conflict(`Cannot delete item — it is still awaiting receipt on Purchase Order ${openPo.poNumber}`);
  }

  const item = await itemRepository.softDeleteById(id, actorId);
  if (!item) throw ApiError.notFound('Item not found');
  await auditLogService.record({ userId: actorId, action: 'delete', module: 'item', entityType: 'Item', entityId: id });
  return item;
}

// --- Bulk import from Excel ---

// Upserts by item name (the source stock register has no SKU column, so name
// is the only stable natural key to re-match on repeat imports). Category is
// auto-classified by keyword (see excelImport/classifyItemCategory.js) and
// unit is matched/auto-created by Pack symbol — both are simple lookup
// masters, safe to create on the fly, unlike the auto-classified category
// which is a best-effort guess surfaced back in the response for review.
async function importItems(fileBuffer, actorId) {
  const { rows, errors } = await parseItemWorkbook(fileBuffer);
  if (errors.length > 0) throw ApiError.validation(errors, 'Could not parse the uploaded item file');
  if (rows.length === 0) throw ApiError.badRequest('No item rows found in the uploaded file');

  const session = await mongoose.startSession();
  let summary;
  try {
    await session.withTransaction(async () => {
      const categoryNames = [...new Set(rows.map((r) => r.category))];
      const categoryDocs = await Promise.all(
        categoryNames.map((name) =>
          Category.findOneAndUpdate(
            { name },
            { $setOnInsert: { name, createdBy: actorId, updatedBy: actorId } },
            { upsert: true, new: true, setDefaultsOnInsert: true, session }
          )
        )
      );
      const categoryIdByName = new Map(categoryDocs.map((c) => [c.name, c._id]));

      const unitSymbols = [...new Set(rows.map((r) => r.unitSymbol))];
      const unitDocs = await Promise.all(
        unitSymbols.map((symbol) =>
          Unit.findOneAndUpdate(
            { symbol },
            { $setOnInsert: { name: symbol, symbol, createdBy: actorId, updatedBy: actorId } },
            { upsert: true, new: true, setDefaultsOnInsert: true, session }
          )
        )
      );
      const unitIdBySymbol = new Map(unitDocs.map((u) => [u.symbol, u._id]));

      const existingNames = new Set(
        (await Item.find({ name: { $in: rows.map((r) => r.name) } }).session(session)).map((i) => i.name)
      );

      const ops = rows.map((row) => {
        const isNew = !existingNames.has(row.name);
        return {
          updateOne: {
            filter: { name: row.name },
            update: {
              $set: {
                name: row.name,
                categoryId: categoryIdByName.get(row.category),
                unitId: unitIdBySymbol.get(row.unitSymbol),
                reorderLevel: row.reorderLevel,
                standardRate: row.standardRate,
                updatedBy: actorId,
              },
              ...(isNew ? { $setOnInsert: { sku: generateCode('ITM'), createdBy: actorId } } : {}),
            },
            upsert: true,
          },
        };
      });
      await Item.bulkWrite(ops, { session });

      summary = {
        totalRows: rows.length,
        created: rows.filter((r) => !existingNames.has(r.name)).length,
        updated: rows.filter((r) => existingNames.has(r.name)).length,
        categorization: rows.map((r) => ({ name: r.name, category: r.category, unitSymbol: r.unitSymbol })),
      };
    });
  } finally {
    await session.endSession();
  }

  await auditLogService.record({ userId: actorId, action: 'import', module: 'item', entityType: 'Item', entityId: null, after: { totalRows: summary.totalRows, created: summary.created, updated: summary.updated } });
  return summary;
}

module.exports = { createItem, listItems, getItemById, updateItem, deleteItem, importItems };
