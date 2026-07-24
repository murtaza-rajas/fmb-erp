const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const stockTransferService = require('../services/stockTransfer.service');

const create = asyncHandler(async (req, res) => {
  const transfer = await stockTransferService.createTransfer(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: transfer });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await stockTransferService.listTransfers({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const markInTransit = asyncHandler(async (req, res) => {
  const transfer = await stockTransferService.markInTransit(req.params.id, req.user._id);
  ApiResponse.send(res, { data: transfer });
});

const complete = asyncHandler(async (req, res) => {
  const transfer = await stockTransferService.completeTransfer(req.params.id, req.user._id);
  ApiResponse.send(res, { data: transfer });
});

module.exports = { create, list, markInTransit, complete };
