const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const permissionService = require('../services/permission.service');

const list = asyncHandler(async (req, res) => {
  const permissions = await permissionService.listPermissions({ module: req.query.module });
  ApiResponse.send(res, { data: permissions });
});

module.exports = { list };
