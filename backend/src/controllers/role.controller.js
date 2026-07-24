const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const roleService = require('../services/role.service');

const create = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: role });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search } = req.query.parsed;
  const { items, total } = await roleService.listRoles({ page, limit, sort, search });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  ApiResponse.send(res, { data: role });
});

const updatePermissions = asyncHandler(async (req, res) => {
  const role = await roleService.updatePermissions(req.params.id, req.body.permissionIds, req.user._id);
  ApiResponse.send(res, { data: role });
});

const remove = asyncHandler(async (req, res) => {
  await roleService.deleteRole(req.params.id, req.user._id);
  ApiResponse.send(res, { data: { deleted: true } });
});

module.exports = { create, list, getById, updatePermissions, remove };
