const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const settingsService = require('../services/settings.service');

const getCompany = asyncHandler(async (req, res) => {
  const settings = await settingsService.getCompanySettings();
  ApiResponse.send(res, { data: settings });
});

const updateCompany = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateCompanySettings(req.body, req.user._id);
  ApiResponse.send(res, { data: settings });
});

const getSystem = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSystemSettings();
  ApiResponse.send(res, { data: settings });
});

const updateSystem = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSystemSettings(req.body, req.user._id);
  ApiResponse.send(res, { data: settings });
});

const getAppConfig = asyncHandler(async (req, res) => {
  const config = await settingsService.getAppConfig();
  ApiResponse.send(res, { data: config });
});

const createApprovalMatrixEntry = asyncHandler(async (req, res) => {
  const entry = await settingsService.createApprovalMatrixEntry(req.body, req.user._id);
  ApiResponse.send(res, { statusCode: 201, data: entry });
});

const listApprovalMatrix = asyncHandler(async (req, res) => {
  const entries = await settingsService.listApprovalMatrix();
  ApiResponse.send(res, { data: entries });
});

const updateApprovalMatrixEntry = asyncHandler(async (req, res) => {
  const entry = await settingsService.updateApprovalMatrixEntry(req.params.id, req.body, req.user._id);
  ApiResponse.send(res, { data: entry });
});

module.exports = {
  getCompany,
  updateCompany,
  getSystem,
  updateSystem,
  getAppConfig,
  createApprovalMatrixEntry,
  listApprovalMatrix,
  updateApprovalMatrixEntry,
};
