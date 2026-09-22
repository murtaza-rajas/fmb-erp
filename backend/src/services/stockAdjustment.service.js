const { mongoose } = require('../config/db');
const stockAdjustmentRepository = require('../repositories/stockAdjustment.repository');
const stockLedgerService = require('./stockLedger.service');
const auditLogService = require('./auditLog.service');
const itemRepository = require('../repositories/item.repository');
const { STOCK_TXN_TYPE } = require('../constants/enums');

async function createAdjustment(payload, actorId) {
  const session = await mongoose.startSession();
  try {
    let adjustment;
    await session.withTransaction(async () => {
      adjustment = await stockAdjustmentRepository.create(
        {
          itemId: payload.itemId,
          storeId: payload.storeId,
          quantity: payload.quantity,
          reason: payload.reason,
          approvedBy: actorId,
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      await stockLedgerService.appendEntry(
        {
          itemId: payload.itemId,
          storeId: payload.storeId,
          transactionType: STOCK_TXN_TYPE.ADJUSTMENT,
          refType: 'StockAdjustment',
          refId: adjustment._id,
          quantity: payload.quantity,
        },
        { session }
      );
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'stock_adjustment', entityType: 'StockAdjustment', entityId: adjustment._id, after: adjustment.toObject() });
    return adjustment;
  } finally {
    await session.endSession();
  }
}

// Search spans the adjustment's own free-text reason (a direct field) plus
// the item it's for (a reference — resolved to matching ids first, same
// pattern used for PRN/PO/GRN/invoice search).
async function listAdjustments({ page, limit, sort, search, filter }) {
  const combinedFilter = { ...filter };
  if (search) {
    const matchingItems = await itemRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 });
    combinedFilter.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { itemId: { $in: matchingItems.map((i) => i._id) } },
    ];
  }
  return stockAdjustmentRepository.findPaginated({ page, limit, sort, filter: combinedFilter, populate: 'itemId storeId approvedBy' });
}

module.exports = { createAdjustment, listAdjustments };
