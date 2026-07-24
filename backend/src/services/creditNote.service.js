const creditNoteRepository = require('../repositories/creditNote.repository');
const ApiError = require('../utils/ApiError');
const auditLogService = require('./auditLog.service');
const vendorLedgerService = require('./vendorLedger.service');
const { generateDocumentNumber } = require('../helpers/numberGenerator');
const { NOTE_STATUS } = require('../constants/enums');

// A credit note also reduces what FMB owes the vendor (e.g. a price
// correction in FMB's favor), so it posts the same direction ledger entry as
// a debit note.
async function createCreditNote(payload, actorId) {
  const cnNumber = await generateDocumentNumber('CN');

  const cn = await creditNoteRepository.create({
    cnNumber,
    vendorId: payload.vendorId,
    amount: payload.amount,
    reason: payload.reason,
    createdBy: actorId,
    updatedBy: actorId,
  });

  await vendorLedgerService.recordEntry({ vendorId: payload.vendorId, entryType: 'credit_note', refType: 'CreditNote', refId: cn._id, debit: payload.amount });
  await auditLogService.record({ userId: actorId, action: 'create', module: 'credit_note', entityType: 'CreditNote', entityId: cn._id, after: cn.toObject() });
  return cn;
}

function listCreditNotes({ page, limit, sort, filter }) {
  return creditNoteRepository.findPaginated({ page, limit, sort, filter, populate: 'vendorId' });
}

async function getCreditNoteById(id) {
  const cn = await creditNoteRepository.findById(id, { populate: 'vendorId' });
  if (!cn) throw ApiError.notFound('Credit Note not found');
  return cn;
}

async function settleCreditNote(id, actorId) {
  const cn = await creditNoteRepository.findById(id);
  if (!cn) throw ApiError.notFound('Credit Note not found');
  if (cn.status === NOTE_STATUS.SETTLED) throw ApiError.conflict('Credit Note is already settled');

  const updated = await creditNoteRepository.updateById(id, { status: NOTE_STATUS.SETTLED, updatedBy: actorId });
  await auditLogService.record({ userId: actorId, action: 'update', module: 'credit_note', entityType: 'CreditNote', entityId: id, before: { status: cn.status }, after: { status: NOTE_STATUS.SETTLED } });
  return updated;
}

module.exports = { createCreditNote, listCreditNotes, getCreditNoteById, settleCreditNote };
