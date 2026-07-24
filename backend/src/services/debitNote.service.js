const debitNoteRepository = require('../repositories/debitNote.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const vendorLedgerService = require('./vendorLedger.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { NOTE_STATUS } = require('../constants/enums');

// A debit note reduces what FMB owes the vendor, so it always posts a debit
// entry to the vendor ledger (see vendorLedger.service.js balance direction).
async function createDebitNote(payload, actorId) {
  const totalAmount = payload.items.reduce((sum, line) => sum + line.amount, 0);
  const dnNumber = await generateDocumentNumber('DN');

  const dn = await debitNoteRepository.create({
    dnNumber,
    vendorId: payload.vendorId,
    poId: payload.poId,
    grnId: payload.grnId,
    items: payload.items,
    totalAmount,
    attachments: payload.attachments || [],
    createdBy: actorId,
    updatedBy: actorId,
  });

  await vendorLedgerService.recordEntry({ vendorId: payload.vendorId, entryType: 'debit_note', refType: 'DebitNote', refId: dn._id, debit: totalAmount });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'debit_note', entityType: 'DebitNote', entityId: dn._id, after: dn.toObject() });
  return dn;
}

// Used internally by grn.service.js (rejected goods) and stockReturn.service.js
// within their own transactions — runs on the caller's session so the debit
// note, its ledger entry, and its trigger (GRN/return) commit or roll back together.
async function createFromEvent({ vendorId, poId, grnId, items, actorId }, { session } = {}) {
  const totalAmount = items.reduce((sum, line) => sum + line.amount, 0);
  const dnNumber = await generateDocumentNumber('DN', { session });

  const dn = await debitNoteRepository.create(
    { dnNumber, vendorId, poId, grnId, items, totalAmount, createdBy: actorId, updatedBy: actorId },
    { session }
  );

  await vendorLedgerService.recordEntry({ vendorId, entryType: 'debit_note', refType: 'DebitNote', refId: dn._id, debit: totalAmount }, { session });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'debit_note', entityType: 'DebitNote', entityId: dn._id, after: dn.toObject() });
  return dn;
}

function listDebitNotes({ page, limit, sort, filter }) {
  return debitNoteRepository.findPaginated({ page, limit, sort, filter, populate: 'vendorId poId grnId' });
}

async function getDebitNoteById(id) {
  const dn = await debitNoteRepository.findById(id, { populate: 'vendorId poId grnId' });
  if (!dn) throw ApiError.notFound('Debit Note not found');
  return dn;
}

async function settleDebitNote(id, actorId) {
  const dn = await debitNoteRepository.findById(id);
  if (!dn) throw ApiError.notFound('Debit Note not found');
  if (dn.status === NOTE_STATUS.SETTLED) throw ApiError.conflict('Debit Note is already settled');

  const updated = await debitNoteRepository.updateById(id, { status: NOTE_STATUS.SETTLED, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'debit_note', entityType: 'DebitNote', entityId: id, before: { status: dn.status }, after: { status: NOTE_STATUS.SETTLED } });
  return updated;
}

module.exports = { createDebitNote, createFromEvent, listDebitNotes, getDebitNoteById, settleDebitNote };
