const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const invoiceService = require('../services/vendorInvoice.service');

const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: invoice });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await invoiceService.listInvoices({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id);
  ApiResponse.send(res, { data: invoice });
});

const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: invoice });
});

const match = asyncHandler(async (req, res) => {
  const result = await invoiceService.matchInvoice(req.params.id, req.user._id);
  ApiResponse.send(res, { data: result });
});

const hold = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.holdInvoice(req.params.id, req.body.reason, req.user._id);
  ApiResponse.send(res, { data: invoice });
});

const release = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.releaseInvoice(req.params.id, req.user._id);
  ApiResponse.send(res, { data: invoice });
});

const overrideMatch = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.overrideMatch(req.params.id, req.body.reason, req.user._id);
  ApiResponse.send(res, { data: invoice });
});

const matchHistory = asyncHandler(async (req, res) => {
  const history = await invoiceService.getMatchHistory(req.params.id);
  ApiResponse.send(res, { data: history });
});

module.exports = { create, list, getById, update, match, hold, release, overrideMatch, matchHistory };
