const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const prnService = require('../services/purchaseRequisition.service');

const create = asyncHandler(async (req, res) => {
  const prn = await prnService.createRequisition(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: prn });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await prnService.listRequisitions({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const prn = await prnService.getRequisitionById(req.params.id);
  ApiResponse.send(res, { data: prn });
});

const update = asyncHandler(async (req, res) => {
  const prn = await prnService.updateRequisition(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: prn });
});

const cancel = asyncHandler(async (req, res) => {
  const prn = await prnService.cancelRequisition(req.params.id, req.user._id);
  ApiResponse.send(res, { data: prn });
});

module.exports = { create, list, getById, update, cancel };
