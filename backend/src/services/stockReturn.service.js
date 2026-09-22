const { mongoose } = require('../config/db');
const stockReturnRepository = require('../repositories/stockReturn.repository');
const stockLedgerService = require('./stockLedger.service');
const debitNoteService = require('./debitNote.service');
const itemRepository = require('../repositories/item.repository');
const vendorItemRateRepository = require('../repositories/vendorItemRate.repository');
const auditLogService = require('./auditLog.service');
const ApiError = require('../utils/ApiError');
const { STOCK_TXN_TYPE } = require('../constants/enums');

async function resolveReturnRate(vendorId, itemId) {
  const vendorRate = await vendorItemRateRepository.findCurrentRate(vendorId, itemId);
  if (vendorRate) return vendorRate.rate;
  const item = await itemRepository.findById(itemId);
  return item?.standardRate ?? 0;
}

// A stock return always produces a debit note (per SOP exception handling)
// and removes the returned quantity from stock in the same transaction.
async function createStockReturn(payload, actorId) {
  for (const line of payload.items) {
    const [balance, item] = await Promise.all([
      stockLedgerService.getBalance(line.itemId, payload.storeId),
      itemRepository.findById(line.itemId),
    ]);
    if (balance < line.quantity) {
      throw ApiError.conflict(`Insufficient stock to return "${item?.name || line.itemId}": have ${balance}, returning ${line.quantity}`);
    }
  }

  const debitNoteLines = await Promise.all(
    payload.items.map(async (line) => {
      const rate = await resolveReturnRate(payload.vendorId, line.itemId);
      return { itemId: line.itemId, quantity: line.quantity, rate, amount: rate * line.quantity, reason: 'return' };
    })
  );

  const session = await mongoose.startSession();
  try {
    let stockReturn;
    // Pre-generate the id so the ledger entries below can reference the
    // stock return directly, without a separate patch-up write afterward.
    const stockReturnId = new mongoose.Types.ObjectId();

    await session.withTransaction(async () => {
      const debitNote = await debitNoteService.createFromEvent(
        { vendorId: payload.vendorId, items: debitNoteLines, actorId },
        { session }
      );

      for (const line of payload.items) {
        await stockLedgerService.appendEntry(
          { itemId: line.itemId, storeId: payload.storeId, transactionType: STOCK_TXN_TYPE.RETURN_OUT, refType: 'StockReturn', refId: stockReturnId, quantity: -line.quantity },
          { session }
        );
      }

      stockReturn = await stockReturnRepository.create(
        {
          _id: stockReturnId,
          storeId: payload.storeId,
          vendorId: payload.vendorId,
          items: payload.items,
          linkedDnId: debitNote._id,
          status: 'completed',
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'stock_return', entityType: 'StockReturn', entityId: stockReturn._id, after: stockReturn.toObject() });
    return stockReturn;
  } finally {
    await session.endSession();
  }
}

function listStockReturns({ page, limit, sort, filter }) {
  return stockReturnRepository.findPaginated({ page, limit, sort, filter, populate: 'storeId vendorId linkedDnId items.itemId' });
}

module.exports = { createStockReturn, listStockReturns };
