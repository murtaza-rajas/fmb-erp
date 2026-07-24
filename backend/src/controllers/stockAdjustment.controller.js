const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const stockAdjustmentService = require('../services/stockAdjustment.service');

const create = asyncHandler(async (req, res) => {
  const adjustment = await stockAdjustmentService.createAdjustment(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: adjustment });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await stockAdjustmentService.listAdjustments({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

module.exports = { create, list };
