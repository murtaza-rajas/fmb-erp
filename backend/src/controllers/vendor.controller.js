const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const vendorService = require('../services/vendor.service');

const create = asyncHandler(async (req, res) => {
  const vendor = await vendorService.createVendor(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: vendor });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await vendorService.listVendors({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const vendor = await vendorService.getVendorById(req.params.id);
  ApiResponse.send(res, { data: vendor });
});

const update = asyncHandler(async (req, res) => {
  const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: vendor });
});

const remove = asyncHandler(async (req, res) => {
  await vendorService.deleteVendor(req.params.id, req.user._id);
  ApiResponse.send(res, { data: { deleted: true } });
});

const addBankAccount = asyncHandler(async (req, res) => {
  const account = await vendorService.addBankAccount(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: account });
});

const listBankAccounts = asyncHandler(async (req, res) => {
  const accounts = await vendorService.listBankAccounts(req.params.id);
  ApiResponse.send(res, { data: accounts });
});

const removeBankAccount = asyncHandler(async (req, res) => {
  await vendorService.removeBankAccount(req.params.id, req.params.accountId, req.user._id);
  ApiResponse.send(res, { data: { deleted: true } });
});

const addItemRate = asyncHandler(async (req, res) => {
  const rate = await vendorService.addItemRate(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: rate });
});

const listItemRates = asyncHandler(async (req, res) => {
  const rates = await vendorService.listItemRates(req.params.id, req.query.itemId);
  ApiResponse.send(res, { data: rates });
});

const importVendors = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Excel file is required (field name "file")');
  const summary = await vendorService.importVendors(req.file.buffer, req.user._id);
  ApiResponse.send(res, { data: summary });
});

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  addBankAccount,
  listBankAccounts,
  removeBankAccount,
  addItemRate,
  listItemRates,
  importVendors,
};
