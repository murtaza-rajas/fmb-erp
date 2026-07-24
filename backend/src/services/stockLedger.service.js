const stockLedgerRepository = require('../repositories/stockLedger.repository');
const itemRepository = require('../repositories/item.repository');

// The single write path into stock_ledger (see database-schema.md — append
// only, never updated in place). Every caller (GRN, adjustments, transfers,
// returns) must go through this so balanceAfter is always computed
// consistently from the previous entry for that item+store.
async function appendEntry({ itemId, storeId, transactionType, refType, refId, quantity }, { session } = {}) {
  const latest = await stockLedgerRepository.findLatest(itemId, storeId, { session });
  const balanceAfter = (latest?.balanceAfter || 0) + quantity;

  return stockLedgerRepository.create(
    { itemId, storeId, transactionType, refType, refId, quantity, balanceAfter },
    { session }
  );
}

async function getBalance(itemId, storeId) {
  const latest = await stockLedgerRepository.findLatest(itemId, storeId);
  return latest?.balanceAfter || 0;
}

// Total across all stores — used by the reorder-level check.
function getTotalBalance(itemId) {
  return stockLedgerRepository.sumQuantityForItem(itemId);
}

function listLedger({ itemId, storeId, from, to, page, limit }) {
  return stockLedgerRepository.findPaginated({ itemId, storeId, from, to, page, limit });
}

// Reorder alerts are checked at the whole-organization level (total quantity
// across all stores vs. the item's reorderLevel) — the SOP defines reorder
// level as an item-master attribute, not a per-store one.
async function getReorderAlerts() {
  const [items, balances] = await Promise.all([
    itemRepository.model.find({ isActive: true, isDeleted: false }).populate('categoryId unitId'),
    stockLedgerRepository.sumQuantityByItem(),
  ]);

  return items
    .map((item) => ({ item, currentQuantity: balances.get(item._id.toString()) || 0 }))
    .filter(({ item, currentQuantity }) => currentQuantity <= item.reorderLevel);
}

module.exports = { appendEntry, getBalance, getTotalBalance, listLedger, getReorderAlerts };
