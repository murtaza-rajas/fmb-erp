const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const stockLedgerService = require('../services/stockLedger.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.query.parsed;
  const { itemId, storeId, from, to } = req.query;
  const { items, total } = await stockLedgerService.listLedger({ itemId, storeId, from, to, page, limit });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const balance = asyncHandler(async (req, res) => {
  const { itemId, storeId } = req.query;
  const quantity = await stockLedgerService.getBalance(itemId, storeId);
  ApiResponse.send(res, { data: { itemId, storeId, quantity } });
});

const reorderAlerts = asyncHandler(async (req, res) => {
  const alerts = await stockLedgerService.getReorderAlerts();
  ApiResponse.send(res, { data: alerts });
});

module.exports = { list, balance, reorderAlerts };
