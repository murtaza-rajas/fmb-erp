const { mongoose } = require('../config/db');
const stockAdjustmentRepository = require('../repositories/stockAdjustment.repository');
const stockLedgerService = require('./stockLedger.service');
const auditLogService = require('./auditLog.service');
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

function listAdjustments({ page, limit, sort, filter }) {
  return stockAdjustmentRepository.findPaginated({ page, limit, sort, filter, populate: 'itemId storeId approvedBy' });
}

module.exports = { createAdjustment, listAdjustments };
