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

  // Batched version of sumApprovedForInvoice, for computing the remaining
  // vouchered balance across a whole list of invoices (e.g. the "available to
  // raise a voucher for" picker) without one aggregate query per invoice.
  async sumApprovedForInvoices(invoiceIds) {
    const rows = await PaymentVoucher.aggregate([
      { $match: { invoiceId: { $in: invoiceIds.map((id) => new mongoose.Types.ObjectId(id)) }, approvalStatus: { $in: ['pending', 'approved'] }, isDeleted: false } },
      { $group: { _id: '$invoiceId', total: { $sum: '$amount' } } },
    ]);
    const map = new Map();
    for (const row of rows) map.set(row._id.toString(), row.total);
    return map;
  }
}

module.exports = new PaymentVoucherRepository();
