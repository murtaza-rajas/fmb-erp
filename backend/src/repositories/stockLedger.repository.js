const mongoose = require('mongoose');
const StockLedger = require('../models/StockLedger.model');

class StockLedgerRepository {
  findLatest(itemId, storeId, { session } = {}) {
    return StockLedger.findOne({ itemId, storeId }).sort({ timestamp: -1 }).session(session ?? null);
  }

  create(data, { session } = {}) {
    return StockLedger.create([data], { session }).then(([doc]) => doc);
  }

  findPaginated({ itemId, storeId, from, to, page = 1, limit = 20 }) {
    const filter = {};
    if (itemId) filter.itemId = itemId;
    if (storeId) filter.storeId = storeId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    return Promise.all([
      StockLedger.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).populate('itemId storeId'),
      StockLedger.countDocuments(filter),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }

  // Total quantity per item across all stores — backs the reorder-alert
  // check, which treats reorder level as a whole-organization threshold
  // rather than a per-store one (SOP doesn't specify per-store reorder rules).
  async sumQuantityByItem() {
    const rows = await StockLedger.aggregate([{ $group: { _id: '$itemId', total: { $sum: '$quantity' } } }]);
    const map = new Map();
    for (const row of rows) map.set(row._id.toString(), row.total);
    return map;
  }

  async sumQuantityForItem(itemId) {
    const rows = await StockLedger.aggregate([
      { $match: { itemId: new mongoose.Types.ObjectId(itemId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    return rows[0]?.total || 0;
  }
}

module.exports = new StockLedgerRepository();
