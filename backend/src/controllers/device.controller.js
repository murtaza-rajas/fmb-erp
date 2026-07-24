const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const deviceTokenService = require('../services/deviceToken.service');

const register = asyncHandler(async (req, res) => {
  const device = await deviceTokenService.registerDevice(req.user._id, req.body);
  ApiResponse.send(res, { data: device });
});

const deregister = asyncHandler(async (req, res) => {
  await deviceTokenService.deregisterDevice(req.user._id, req.params.deviceId);
  ApiResponse.send(res, { data: { deregistered: true } });
});

module.exports = { register, deregister };
