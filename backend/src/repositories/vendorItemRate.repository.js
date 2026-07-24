const VendorItemRate = require('../models/VendorItemRate.model');

class VendorItemRateRepository {
  create(data) {
    return VendorItemRate.create(data);
  }

  findForVendor(vendorId, { itemId } = {}) {
    const filter = { vendorId };
    if (itemId) filter.itemId = itemId;
    return VendorItemRate.find(filter).sort({ effectiveFrom: -1 }).populate('itemId');
  }

  findCurrentRate(vendorId, itemId) {
    return VendorItemRate.findOne({ vendorId, itemId, effectiveTo: null }).sort({ effectiveFrom: -1 });
  }

  closeCurrentRate(vendorId, itemId, effectiveTo = new Date()) {
    return VendorItemRate.updateMany({ vendorId, itemId, effectiveTo: null }, { effectiveTo });
  }
}

module.exports = new VendorItemRateRepository();
