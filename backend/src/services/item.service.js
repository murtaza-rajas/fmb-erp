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
const storeRepository = require('../repositories/store.repository');
const stockLedgerService = require('./stockLedger.service');
const stockAdjustmentService = require('./stockAdjustment.service');

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

async function listItems({ page, limit, sort, search, filter }) {
  const result = await itemRepository.findPaginated({
    page,
    limit,
    sort,
    search,
    filter,
    searchFields: ['name', 'sku'],
    populate: 'categoryId unitId taxId',
  });

  const stockByItem = await stockLedgerService.getStockMap();
  const items = result.items.map((item) => {
    const obj = item.toObject();
    obj.currentStock = stockByItem.get(item._id.toString()) || 0;
    return obj;
  });

  return { ...result, items };
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
async function importItems(fileBuffer, actorId, storeId) {
  const { rows, errors, hasOpeningStockColumn } = await parseItemWorkbook(fileBuffer);
  if (errors.length > 0) throw ApiError.validation(errors, 'Could not parse the uploaded item file');
  if (rows.length === 0) throw ApiError.badRequest('No item rows found in the uploaded file');

  if (storeId) {
    const store = await storeRepository.findById(storeId);
    if (!store) throw ApiError.notFound('Store not found');
  }

  const session = await mongoose.startSession();
  let summary;
  let existingNames;
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

      existingNames = new Set(
        (await Item.find({ name: { $in: rows.map((r) => r.name) } }).session(session)).map((i) => i.name)
      );

      const ops = rows.map((row) => {
        const isNew = !existingNames.has(row.name);
        const set = {
          name: row.name,
          categoryId: categoryIdByName.get(row.category),
          unitId: unitIdBySymbol.get(row.unitSymbol),
          updatedBy: actorId,
        };
        const setOnInsert = {};
        if (isNew) {
          setOnInsert.sku = generateCode('ITM');
          setOnInsert.createdBy = actorId;
        }

        // row.reorderLevel/standardRate are null when the file didn't carry
        // that column/cell for this row — preserve the existing item's value
        // rather than overwriting it with an assumed 0 (see
        // parseItemWorkbook.js). A brand-new item still needs some value to
        // satisfy the schema, so it defaults to 0 only on insert.
        if (row.reorderLevel != null) set.reorderLevel = row.reorderLevel;
        else if (isNew) setOnInsert.reorderLevel = 0;

        if (row.standardRate != null) set.standardRate = row.standardRate;
        else if (isNew) setOnInsert.standardRate = 0;

        return {
          updateOne: {
            filter: { name: row.name },
            update: {
              $set: set,
              ...(Object.keys(setOnInsert).length > 0 ? { $setOnInsert: setOnInsert } : {}),
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

  // Optional stock reconciliation pass — only runs when a store was given and
  // the file actually had an "Op. Stock" column. Only applies to items that
  // already existed before this import; a freshly auto-created item has no
  // real baseline to reconcile against, so it's reported as skipped instead
  // of silently given an arbitrary opening balance.
  if (storeId && hasOpeningStockColumn) {
    const items = await Item.find({ name: { $in: rows.map((r) => r.name) } });
    const itemIdByName = new Map(items.map((i) => [i.name, i._id]));

    const skippedNewItems = [];
    let stockUpdated = 0;
    let stockUnchanged = 0;

    for (const row of rows) {
      if (!existingNames.has(row.name)) {
        skippedNewItems.push(row.name);
        continue;
      }
      const itemId = itemIdByName.get(row.name);
      const currentBalance = await stockLedgerService.getBalance(itemId, storeId);
      const delta = Math.round((row.openingStock - currentBalance) * 100) / 100;
      if (delta === 0) {
        stockUnchanged += 1;
        continue;
      }
      await stockAdjustmentService.createAdjustment(
        { itemId, storeId, quantity: delta, reason: 'Stock reconciliation via item Excel import' },
        actorId
      );
      stockUpdated += 1;
    }

    summary.stock = { updated: stockUpdated, unchanged: stockUnchanged, skippedNewItems };
  }

  await auditLogService.record({ userId: actorId, action: 'import', module: 'item', entityType: 'Item', entityId: null, after: { totalRows: summary.totalRows, created: summary.created, updated: summary.updated, stock: summary.stock } });
  return summary;
}

module.exports = { createItem, listItems, getItemById, updateItem, deleteItem, importItems };
