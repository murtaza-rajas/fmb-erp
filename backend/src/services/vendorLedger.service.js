const vendorLedgerEntryRepository = require('../repositories/vendorLedgerEntry.repository');

// Single write path into vendor_ledger_entries (see database-schema.md) — the
// same append-only balance pattern as stockLedger.service.js. balanceAfter is
// FMB's payable to the vendor: credit increases it, debit decreases it.
async function recordEntry({ vendorId, entryType, refType, refId, debit = 0, credit = 0 }, { session } = {}) {
  const latest = await vendorLedgerEntryRepository.findLatest(vendorId, { session });
  const balanceAfter = (latest?.balanceAfter || 0) + credit - debit;

  return vendorLedgerEntryRepository.create(
    { vendorId, entryType, refType, refId, debit, credit, balanceAfter },
    { session }
  );
}

async function getOutstandingBalance(vendorId) {
  const latest = await vendorLedgerEntryRepository.findLatest(vendorId);
  return latest?.balanceAfter || 0;
}

function listLedger(vendorId, { page, limit }) {
  return vendorLedgerEntryRepository.findPaginated({ vendorId, page, limit });
}

module.exports = { recordEntry, getOutstandingBalance, listLedger };
