const VendorLedgerEntry = require('../models/VendorLedgerEntry.model');

class VendorLedgerEntryRepository {
  findLatest(vendorId, { session } = {}) {
    return VendorLedgerEntry.findOne({ vendorId }).sort({ timestamp: -1 }).session(session ?? null);
  }

  create(data, { session } = {}) {
    return VendorLedgerEntry.create([data], { session }).then(([doc]) => doc);
  }

  findPaginated({ vendorId, page = 1, limit = 20 }) {
    const filter = {};
    if (vendorId) filter.vendorId = vendorId;
    return Promise.all([
      VendorLedgerEntry.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit),
      VendorLedgerEntry.countDocuments(filter),
    ]).then(([items, total]) => ({ items, total, page, limit }));
  }
}

module.exports = new VendorLedgerEntryRepository();
