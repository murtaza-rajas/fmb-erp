const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const userService = require('../services/user.service');

const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: user });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, sort, search, filter } = req.query.parsed;
  const { items, total } = await userService.listUsers({ page, limit, sort, search, filter });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const getById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  ApiResponse.send(res, { data: user });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: user });
});

const updateStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(req.params.id, req.body.status, req.user._id);
  ApiResponse.send(res, { data: user });
});

const assignRole = asyncHandler(async (req, res) => {
  const user = await userService.assignRole(req.params.id, req.body.roleId, req.user._id);
  ApiResponse.send(res, { data: user });
});

const remove = asyncHandler(async (req, res) => {
  await userService.softDeleteUser(req.params.id, req.user._id);
  ApiResponse.send(res, { data: { deleted: true } });
});

module.exports = { create, list, getById, update, updateStatus, assignRole, remove };
