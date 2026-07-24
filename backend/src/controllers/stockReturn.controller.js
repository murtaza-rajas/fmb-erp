const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const stockReturnService = require('../services/stockReturn.service');

const create = asyncHandler(async (req, res) => {
  const stockReturn = await stockReturnService.createStockReturn(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: stockReturn });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await stockReturnService.listStockReturns({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

module.exports = { create, list };
