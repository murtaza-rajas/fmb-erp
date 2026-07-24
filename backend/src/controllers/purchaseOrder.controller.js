const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const poService = require('../services/purchaseOrder.service');

const create = asyncHandler(async (req, res) => {
  const po = await poService.createPurchaseOrder(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: po });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await poService.listPurchaseOrders({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const po = await poService.getPurchaseOrderById(req.params.id);
  ApiResponse.send(res, { data: po });
});

const issue = asyncHandler(async (req, res) => {
  const po = await poService.issuePurchaseOrder(req.params.id, req.user._id);
  ApiResponse.send(res, { data: po });
});

const cancel = asyncHandler(async (req, res) => {
  const po = await poService.cancelPurchaseOrder(req.params.id, req.body.reason, req.user._id);
  ApiResponse.send(res, { data: po });
});

const revise = asyncHandler(async (req, res) => {
  const po = await poService.revisePurchaseOrder(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: po });
});

const timeline = asyncHandler(async (req, res) => {
  const events = await poService.getTimeline(req.params.id);
  ApiResponse.send(res, { data: events });
});

const print = asyncHandler(async (req, res) => {
  const pdfBuffer = await poService.generatePdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.id}.pdf"`);
  res.send(pdfBuffer);
});

const sendEmail = asyncHandler(async (req, res) => {
  const po = await poService.sendPoEmail(req.params.id, req.user._id);
  ApiResponse.send(res, { data: po });
});

module.exports = { create, list, getById, issue, cancel, revise, timeline, print, sendEmail };
