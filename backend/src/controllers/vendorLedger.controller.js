const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const vendorLedgerService = require('../services/vendorLedger.service');
const Vendor = require('../models/Vendor.model');

const getLedger = asyncHandler(async (req, res) => {
  const { page, limit } = req.query.parsed;
  const { items, total } = await vendorLedgerService.listLedger(req.params.vendorId, { page, limit });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

// Vendors with a positive outstanding payable balance — a simple, direct
// reading of the vendor ledger rather than a separate materialized report.
const outstandingPayments = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ isDeleted: false });
  const results = await Promise.all(
    vendors.map(async (vendor) => ({ vendor, outstandingBalance: await vendorLedgerService.getOutstandingBalance(vendor._id) }))
  );
  ApiResponse.send(res, { data: results.filter((r) => r.outstandingBalance > 0) });
});

module.exports = { getLedger, outstandingPayments };
