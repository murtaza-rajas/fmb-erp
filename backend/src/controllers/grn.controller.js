const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const grnService = require('../services/grn.service');

const create = asyncHandler(async (req, res) => {
  const result = await grnService.createGrn(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: result });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter } = req.query.parsed;
  const { items, total } = await grnService.listGrns({ page, limit, sort, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const grn = await grnService.getGrnById(req.params.id);
  ApiResponse.send(res, { data: grn });
});

module.exports = { create, list, getById };
