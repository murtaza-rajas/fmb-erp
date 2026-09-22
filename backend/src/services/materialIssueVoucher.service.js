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
  // Rate is snapshotted at issue time (mirrors PurchaseOrder's line-item
  // rate/amount) so historical voucher cost stays stable even if an item's
  // standardRate changes later. Fetched once per line and reused for both the
  // stock check and the rate snapshot, so an insufficient-stock error can
  // name the item instead of just its id.
  const items = await Promise.all(
    payload.items.map(async (line) => {
      const item = await itemRepository.findById(line.itemId);
      if (!item) throw ApiError.badRequest(`Item ${line.itemId} not found`);

      const balance = await stockLedgerService.getBalance(line.itemId, payload.storeId);
      if (balance < line.quantity) {
        throw ApiError.conflict(`Insufficient stock to issue "${item.name}": have ${balance}, issuing ${line.quantity}`);
      }

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

// Search spans the voucher's own number (a direct field) plus the items
// issued on it (a reference — resolved to matching ids first, same pattern
// used for PRN/PO/GRN/invoice/adjustment search).
async function listMaterialIssueVouchers({ page, limit, sort, search, filter }) {
  const combinedFilter = { ...filter };
  if (search) {
    const matchingItems = await itemRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 });
    combinedFilter.$or = [
      { voucherNumber: { $regex: search, $options: 'i' } },
      { 'items.itemId': { $in: matchingItems.map((i) => i._id) } },
    ];
  }
  return materialIssueRepository.findPaginated({
    page,
    limit,
    sort,
    filter: combinedFilter,
    populate: 'storeId issuedBy items.itemId',
  });
}

async function getMaterialIssueVoucherById(id) {
  const voucher = await materialIssueRepository.findById(id, { populate: 'storeId issuedBy items.itemId' });
  if (!voucher) throw ApiError.notFound('Material Issue Voucher not found');
  return voucher;
}

module.exports = { createMaterialIssueVoucher, listMaterialIssueVouchers, getMaterialIssueVoucherById };
