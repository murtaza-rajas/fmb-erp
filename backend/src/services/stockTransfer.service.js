const { mongoose } = require('../config/db');
const stockTransferRepository = require('../repositories/stockTransfer.repository');
const stockLedgerService = require('./stockLedger.service');
const auditLogService = require('./auditLog.service');
const ApiError = require('../utils/ApiError');
const { STOCK_TXN_TYPE, STOCK_TRANSFER_STATUS } = require('../constants/enums');

async function createTransfer(payload, actorId) {
  const transfer = await stockTransferRepository.create({
    fromStoreId: payload.fromStoreId,
    toStoreId: payload.toStoreId,
    items: payload.items,
    status: STOCK_TRANSFER_STATUS.PENDING,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await auditLogService.record({ userId: actorId, action: 'create', module: 'stock_transfer', entityType: 'StockTransfer', entityId: transfer._id, after: transfer.toObject() });
  return transfer;
}

function listTransfers({ page, limit, sort, filter }) {
  return stockTransferRepository.findPaginated({ page, limit, sort, filter, populate: 'fromStoreId toStoreId items.itemId' });
}

async function markInTransit(id, actorId) {
  const transfer = await stockTransferRepository.findById(id);
  if (!transfer) throw ApiError.notFound('Stock Transfer not found');
  if (transfer.status !== STOCK_TRANSFER_STATUS.PENDING) {
    throw ApiError.conflict(`Only a pending transfer can be marked in-transit (current status "${transfer.status}")`);
  }

  const updated = await stockTransferRepository.updateById(id, { status: STOCK_TRANSFER_STATUS.IN_TRANSIT, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'stock_transfer', entityType: 'StockTransfer', entityId: id, before: { status: STOCK_TRANSFER_STATUS.PENDING }, after: { status: STOCK_TRANSFER_STATUS.IN_TRANSIT } });
  return updated;
}

// Writes both legs of the transfer atomically — a transfer must never leave
// stock deducted from the source without it landing at the destination.
async function completeTransfer(id, actorId) {
  const transfer = await stockTransferRepository.findById(id);
  if (!transfer) throw ApiError.notFound('Stock Transfer not found');
  if (![STOCK_TRANSFER_STATUS.PENDING, STOCK_TRANSFER_STATUS.IN_TRANSIT].includes(transfer.status)) {
    throw ApiError.conflict(`Cannot complete a transfer in status "${transfer.status}"`);
  }

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      for (const line of transfer.items) {
        await stockLedgerService.appendEntry(
          { itemId: line.itemId, storeId: transfer.fromStoreId, transactionType: STOCK_TXN_TYPE.TRANSFER_OUT, refType: 'StockTransfer', refId: transfer._id, quantity: -line.quantity },
          { session }
        );
        await stockLedgerService.appendEntry(
          { itemId: line.itemId, storeId: transfer.toStoreId, transactionType: STOCK_TXN_TYPE.TRANSFER_IN, refType: 'StockTransfer', refId: transfer._id, quantity: line.quantity },
          { session }
        );
      }

      updated = await stockTransferRepository.updateById(id, { status: STOCK_TRANSFER_STATUS.COMPLETED, updatedBy: actorId }, { session });
    });

    await auditLogService.record({ userId: actorId, action: 'update', module: 'stock_transfer', entityType: 'StockTransfer', entityId: id, before: { status: transfer.status }, after: { status: STOCK_TRANSFER_STATUS.COMPLETED } });
    return updated;
  } finally {
    await session.endSession();
  }
}

module.exports = { createTransfer, listTransfers, markInTransit, completeTransfer };
