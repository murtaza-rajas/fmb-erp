const { mongoose } = require('../config/db');
const grnRepository = require('../repositories/grn.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
const vendorRepository = require('../repositories/vendor.repository');
const itemRepository = require('../repositories/item.repository');
const poStatusHistoryRepository = require('../repositories/poStatusHistory.repository');
const stockLedgerService = require('./stockLedger.service');
const debitNoteService = require('./debitNote.service');
const auditLogService = require('./auditLog.service');
const ApiError = require('../utils/ApiError');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { PO_STATUS, STOCK_TXN_TYPE } = require('../constants/enums');

const RECEIVABLE_PO_STATUSES = [PO_STATUS.ISSUED, PO_STATUS.PARTIALLY_RECEIVED];

// Rejected/damaged quantity is treated as "delivered against the PO line"
// (excluded from stock and payment via an auto-generated debit note) rather
// than leaving the line open for redelivery — the SOP specifies this
// exclusion but doesn't address redelivery, so this is the simplifying
// convention: receivedQty + rejectedQty together close out the ordered qty.
// Genuine under-delivery (nothing sent) remains open via isPartial, per the
// SOP's explicit "short supply" rule.
async function createGrn(payload, actorId) {
  const po = await purchaseOrderRepository.findById(payload.poId);
  if (!po) throw ApiError.notFound('Purchase Order not found');
  if (!RECEIVABLE_PO_STATUSES.includes(po.status)) {
    throw ApiError.conflict(`Cannot record a GRN against a PO in status "${po.status}"`);
  }

  const poLinesByItem = new Map(po.items.map((line) => [line.itemId.toString(), line]));
  const alreadyReceived = await grnRepository.sumReceivedForPo(payload.poId);

  const grnItems = [];
  const debitNoteLines = [];
  let allLinesFulfilled = true;

  for (const line of payload.items) {
    const poLine = poLinesByItem.get(line.itemId.toString());
    if (!poLine) throw ApiError.badRequest(`Item ${line.itemId} is not on this Purchase Order`);

    const receivedSoFar = alreadyReceived.get(line.itemId.toString()) || 0;
    const remaining = poLine.quantity - receivedSoFar;
    const thisDelivery = Number(line.receivedQty) + Number(line.rejectedQty || 0);

    if (thisDelivery > remaining) {
      throw ApiError.badRequest(`Item ${line.itemId}: receiving ${thisDelivery} exceeds the remaining ordered quantity (${remaining})`);
    }

    grnItems.push({
      itemId: line.itemId,
      orderedQty: poLine.quantity,
      receivedQty: line.receivedQty,
      rejectedQty: line.rejectedQty || 0,
      rejectionReason: line.rejectionReason,
      remarks: line.remarks,
    });

    if (receivedSoFar + thisDelivery < poLine.quantity) allLinesFulfilled = false;

    if (line.rejectedQty > 0) {
      debitNoteLines.push({
        itemId: line.itemId,
        quantity: line.rejectedQty,
        rate: poLine.rate,
        amount: line.rejectedQty * poLine.rate,
        reason: line.rejectionReason || 'damaged',
      });
    }
  }

  const newPoStatus = allLinesFulfilled ? PO_STATUS.RECEIVED : PO_STATUS.PARTIALLY_RECEIVED;

  const session = await mongoose.startSession();
  try {
    let grn;
    let debitNote = null;

    await session.withTransaction(async () => {
      const grnNumber = await generateDocumentNumber('GRN', { session });

      grn = await grnRepository.create(
        {
          grnNumber,
          poId: payload.poId,
          storeId: payload.storeId,
          items: grnItems,
          receivedBy: actorId,
          isPartial: !allLinesFulfilled,
          cartingCharges: payload.cartingCharges || 0,
          attachments: payload.attachments || [],
          createdBy: actorId,
          updatedBy: actorId,
        },
        { session }
      );

      for (const item of grnItems) {
        if (item.receivedQty > 0) {
          await stockLedgerService.appendEntry(
            {
              itemId: item.itemId,
              storeId: payload.storeId,
              transactionType: STOCK_TXN_TYPE.GRN_IN,
              refType: 'Grn',
              refId: grn._id,
              quantity: item.receivedQty,
            },
            { session }
          );
        }
      }

      if (debitNoteLines.length > 0) {
        debitNote = await debitNoteService.createFromEvent(
          { vendorId: po.vendorId, poId: payload.poId, grnId: grn._id, items: debitNoteLines, actorId },
          { session }
        );
      }

      await purchaseOrderRepository.updateById(payload.poId, { status: newPoStatus, updatedBy: actorId }, { session });
      await poStatusHistoryRepository.record(
        { poId: payload.poId, fromStatus: po.status, toStatus: newPoStatus, changedBy: actorId, remarks: `GRN ${grnNumber} recorded` },
        { session }
      );
    });

    await auditLogService.record({ userId: actorId, action: 'create', module: 'grn', entityType: 'Grn', entityId: grn._id, after: grn.toObject() });
    return { grn, debitNote, poStatus: newPoStatus };
  } finally {
    await session.endSession();
  }
}

// Search spans the GRN's own number plus three referenced things (the linked
// PO's number, its vendor's name, and the items on the GRN) — Grn only
// stores poId (one PO per GRN, not per-item like VendorInvoice), so
// resolving matching PO ids covers both the PO-number and vendor-name cases;
// items.itemId is resolved separately since it lives on the GRN itself.
// Mirrors the same resolve-to-ids pattern used for invoice search
// (vendorInvoice.service.js#listInvoices).
async function listGrns({ page, limit, sort, search, filter = {} }) {
  const { from, to, ...rest } = filter;
  const dateFilter = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.$gte = new Date(from);
    if (to) dateFilter.createdAt.$lte = new Date(to);
  }

  const combinedFilter = { ...rest, ...dateFilter };
  if (search) {
    const [posByNumber, vendorsByName, matchingItems] = await Promise.all([
      purchaseOrderRepository.model.find({ poNumber: { $regex: search, $options: 'i' } }, { _id: 1 }),
      vendorRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 }),
      itemRepository.model.find({ name: { $regex: search, $options: 'i' } }, { _id: 1 }),
    ]);
    const posByVendor = vendorsByName.length
      ? await purchaseOrderRepository.model.find({ vendorId: { $in: vendorsByName.map((v) => v._id) } }, { _id: 1 })
      : [];
    const poIds = [...new Map([...posByNumber, ...posByVendor].map((po) => [po._id.toString(), po._id])).values()];

    combinedFilter.$or = [
      { grnNumber: { $regex: search, $options: 'i' } },
      { poId: { $in: poIds } },
      { 'items.itemId': { $in: matchingItems.map((i) => i._id) } },
    ];
  }

  return grnRepository.findPaginated({ page, limit, sort, filter: combinedFilter, populate: 'poId storeId receivedBy items.itemId' });
}

async function getGrnById(id) {
  const grn = await grnRepository.findById(id, { populate: 'poId storeId receivedBy items.itemId' });
  if (!grn) throw ApiError.notFound('GRN not found');
  return grn;
}

module.exports = { createGrn, listGrns, getGrnById };
