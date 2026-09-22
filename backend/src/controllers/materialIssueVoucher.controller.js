const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const materialIssueVoucherService = require('../services/materialIssueVoucher.service');

const create = asyncHandler(async (req, res) => {
  const voucher = await materialIssueVoucherService.createMaterialIssueVoucher(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: voucher });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await materialIssueVoucherService.listMaterialIssueVouchers({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const voucher = await materialIssueVoucherService.getMaterialIssueVoucherById(req.params.id);
  ApiResponse.send(res, { data: voucher });
});

module.exports = { create, list, getById };
