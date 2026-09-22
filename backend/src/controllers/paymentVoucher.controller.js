const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const voucherService = require('../services/paymentVoucher.service');

const create = asyncHandler(async (req, res) => {
  const voucher = await voucherService.createVoucher(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: voucher });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await voucherService.listVouchers({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const availableInvoices = asyncHandler(async (req, res) => {
  const invoices = await voucherService.getInvoicesAvailableForVoucher();
  ApiResponse.send(res, { data: invoices });
});

const getById = asyncHandler(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.id);
  ApiResponse.send(res, { data: voucher });
});

const approve = asyncHandler(async (req, res) => {
  const voucher = await voucherService.approveVoucher(req.params.id, req.user, req.body.waivedDebitNoteIds);
  ApiResponse.send(res, { data: voucher });
});

const reject = asyncHandler(async (req, res) => {
  const voucher = await voucherService.rejectVoucher(req.params.id, req.body.reason, req.user._id);
  ApiResponse.send(res, { data: voucher });
});

module.exports = { create, list, getById, approve, reject, availableInvoices };
