const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const advancePaymentService = require('../services/advancePayment.service');

const create = asyncHandler(async (req, res) => {
  const advance = await advancePaymentService.createAdvancePayment(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: advance });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await advancePaymentService.listAdvancePayments({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const adjust = asyncHandler(async (req, res) => {
  const advance = await advancePaymentService.adjustAdvancePayment(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: advance });
});

module.exports = { create, list, adjust };
