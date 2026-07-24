const { mongoose } = require('../config/db');
const grnRepository = require('../repositories/grn.repository');
const purchaseOrderRepository = require('../repositories/purchaseOrder.repository');
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

function listGrns({ page, limit, sort, filter }) {
  return grnRepository.findPaginated({ page, limit, sort, filter, populate: 'poId storeId receivedBy items.itemId' });
}

async function getGrnById(id) {
  const grn = await grnRepository.findById(id, { populate: 'poId storeId receivedBy items.itemId' });
  if (!grn) throw ApiError.notFound('GRN not found');
  return grn;
}

module.exports = { createGrn, listGrns, getGrnById };
