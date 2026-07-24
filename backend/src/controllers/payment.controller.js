const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const paymentService = require('../services/payment.service');

const create = asyncHandler(async (req, res) => {
  const payment = await paymentService.processPayment(req.body.voucherId, req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: payment });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await paymentService.listPayments({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id);
  ApiResponse.send(res, { data: payment });
});

const advice = asyncHandler(async (req, res) => {
  const pdfBuffer = await paymentService.generateAdvicePdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.id}-advice.pdf"`);
  res.send(pdfBuffer);
});

module.exports = { create, list, getById, advice };
