const VendorBankAccount = require('../models/VendorBankAccount.model');

class VendorBankAccountRepository {
  create(data) {
    return VendorBankAccount.create(data);
  }

  findForVendor(vendorId) {
    return VendorBankAccount.find({ vendorId }).sort({ isPrimary: -1, createdAt: -1 });
  }

  findById(id) {
    return VendorBankAccount.findById(id);
  }

  async unsetPrimaryForVendor(vendorId) {
    await VendorBankAccount.updateMany({ vendorId, isPrimary: true }, { isPrimary: false });
  }

  softDeleteById(id, userId) {
    return VendorBankAccount.findById(id).then((doc) => doc && doc.softDelete(userId));
  }
}

module.exports = new VendorBankAccountRepository();
