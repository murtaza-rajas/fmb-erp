const { mongoose } = require('../config/db');
const materialIssueRepository = require('../repositories/materialIssueVoucher.repository');
const stockLedgerService = require('./stockLedger.service');
const itemRepository = require('../repositories/item.repository');
const auditLogService = require('./auditLog.service');
const ApiError = require('../utils/ApiError');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { STOCK_TXN_TYPE } = require('../constants/enums');

// Material physically leaving the Store for kitchen/event use is a real
// stock-out (like StockReturn, unlike the Thaali Cost Report which is a
// pure read-side aggregation over these vouchers — see report.service.js).
async function createMaterialIssueVoucher(payload, actorId) {
  for (const line of payload.items) {
    const balance = await stockLedgerService.getBalance(line.itemId, payload.storeId);
    if (balance < line.quantity) {
      throw ApiError.conflict(`Insufficient stock to issue item ${line.itemId}: have ${balance}, issuing ${line.quantity}`);
    }
  }

  // Rate is snapshotted at issue time (mirrors PurchaseOrder's line-item
  // rate/amount) so historical voucher cost stays stable even if an item's
  // standardRate changes later.
  const items = await Promise.all(
    payload.items.map(async (line) => {
      const item = await itemRepository.findById(line.itemId);
      if (!item) throw ApiError.badRequest(`Item ${line.itemId} not found`);
      const rate = item.standardRate;
      return { itemId: line.itemId, quantity: line.quantity, rate, lineCost: rate * line.quantity };
    })
  );
  const totalCost = items.reduce((sum, i) => sum + i.lineCost, 0);

  const session = await mongoose.startSession();
  try {
    let voucher;
    await session.withTransaction(async () => {
      const voucherNumber = await generateDocumentNumber('MIV', { session });

      voucher = await materialIssueRepository.create(
        {
          voucherNumber,
          storeId: payload.storeId,
          category: payload.category,
          thaaliCount: payload.thaaliCount,
          issueDate: payload.issueDate || new Date(),
          issuedBy: actorId,
          items,
          totalCost,
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      for (const line of items) {
        await stockLedgerService.appendEntry(
          {
            itemId: line.itemId,
            storeId: payload.storeId,
            transactionType: STOCK_TXN_TYPE.ISSUE_OUT,
            refType: 'MaterialIssue',
            refId: voucher._id,
            quantity: -line.quantity,
          },
          { session }
        );
      }
    });

    await auditLogService.record({
      userId: actorId,
      action: 'create',
      module: 'material_issue',
      entityType: 'MaterialIssueVoucher',
      entityId: voucher._id,
      after: voucher.toObject(),
    });
    return voucher;
  } finally {
    await session.endSession();
  }
}

function listMaterialIssueVouchers({ page, limit, sort, filter }) {
  return materialIssueRepository.findPaginated({
    page,
    limit,
    sort,
    filter,
    populate: 'storeId issuedBy items.itemId',
  });
}

async function getMaterialIssueVoucherById(id) {
  const voucher = await materialIssueRepository.findById(id, { populate: 'storeId issuedBy items.itemId' });
  if (!voucher) throw ApiError.notFound('Material Issue Voucher not found');
  return voucher;
}

module.exports = { createMaterialIssueVoucher, listMaterialIssueVouchers, getMaterialIssueVoucherById };
