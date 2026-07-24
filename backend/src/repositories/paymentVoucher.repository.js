const mongoose = require('mongoose');
const BaseRepository = require('./base.repository');
const PaymentVoucher = require('../models/PaymentVoucher.model');

class PaymentVoucherRepository extends BaseRepository {
  constructor() {
    super(PaymentVoucher);
  }

  // Note: aggregate() $match does not auto-cast string ids like find() does —
  // always cast explicitly (see the GRN over-receipt bug this same mistake
  // caused, fixed in grn.repository.js).
  sumApprovedForInvoice(invoiceId) {
    return PaymentVoucher.aggregate([
      { $match: { invoiceId: new mongoose.Types.ObjectId(invoiceId), approvalStatus: { $in: ['pending', 'approved'] }, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).then((rows) => rows[0]?.total || 0);
  }
}

module.exports = new PaymentVoucherRepository();
