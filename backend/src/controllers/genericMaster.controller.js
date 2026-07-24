const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

// Pairs with services/genericMaster.service.js — one controller shape for
// every simple lookup master.
function createMasterController(service, { populate } = {}) {
  const create = asyncHandler(async (req, res) => {
    const doc = await service.create(req.body, req.user._id);
    ApiResponse.send(res, { statusCode: 201, data: doc });
  });

  const list = asyncHandler(async (req, res) => {
    const { page, limit, sort, search, filter } = req.query.parsed;
    const { items, total } = await service.list({ page, limit, sort, search, filter, populate });
    ApiResponse.send(res, { data: items, meta: { page, limit, total } });
  });

  const getById = asyncHandler(async (req, res) => {
    const doc = await service.getById(req.params.id, { populate });
    ApiResponse.send(res, { data: doc });
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await service.update(req.params.id, req.body, req.user._id);
    ApiResponse.send(res, { data: doc });
  });

  const remove = asyncHandler(async (req, res) => {
    await service.remove(req.params.id, req.user._id);
    ApiResponse.send(res, { data: { deleted: true } });
  });

  return { create, list, getById, update, remove };
}

module.exports = createMasterController;
