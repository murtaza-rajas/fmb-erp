const mongoose = require('mongoose');
const BaseRepository = require('./base.repository');
const Grn = require('../models/Grn.model');

class GrnRepository extends BaseRepository {
  constructor() {
    super(Grn);
  }

  // Sums (receivedQty + rejectedQty) already logged against a PO, per item,
  // across all existing GRNs — both count as "accounted for" against the
  // ordered quantity (see grn.service.js), so this is what the over-receipt
  // guard and the received/partially-received determination compare against.
  // poId must be cast to ObjectId explicitly — aggregate() $match does not
  // auto-cast query values the way find() does.
  async sumReceivedForPo(poId) {
    const rows = await Grn.aggregate([
      { $match: { poId: new mongoose.Types.ObjectId(poId), isDeleted: false } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemId', totalAccounted: { $sum: { $add: ['$items.receivedQty', '$items.rejectedQty'] } } } },
    ]);
    const map = new Map();
    for (const row of rows) map.set(row._id.toString(), row.totalAccounted);
    return map;
  }
}

module.exports = new GrnRepository();
