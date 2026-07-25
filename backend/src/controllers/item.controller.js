const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const itemService = require('../services/item.service');
const stockLedgerService = require('../services/stockLedger.service');

const create = asyncHandler(async (req, res) => {
  const item = await itemService.createItem(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: item });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await itemService.listItems({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const item = await itemService.getItemById(req.params.id);
  ApiResponse.send(res, { data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await itemService.updateItem(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: item });
});

const remove = asyncHandler(async (req, res) => {
  await itemService.deleteItem(req.params.id, req.user._id);
  ApiResponse.send(res, { data: { deleted: true } });
});

const lowStockCheck = asyncHandler(async (req, res) => {
  const item = await itemService.getItemById(req.params.id);
  const currentQuantity = await stockLedgerService.getTotalBalance(req.params.id);
  ApiResponse.send(res, { data: { itemId: req.params.id, reorderLevel: item.reorderLevel, currentQuantity, isBelowReorderLevel: currentQuantity <= item.reorderLevel } });
});

const importItems = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Excel file is required (field name "file")');
  const summary = await itemService.importItems(req.file.buffer, req.user._id);
  ApiResponse.send(res, { data: summary });
});

module.exports = { create, list, getById, update, remove, lowStockCheck, importItems };
