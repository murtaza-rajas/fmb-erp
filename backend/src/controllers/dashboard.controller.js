const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const dashboardService = require('../services/dashboard.service');

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary();
  ApiResponse.send(res, { data });
});

const vendorPerformance = asyncHandler(async (req, res) => {
  const data = await dashboardService.getVendorPerformance();
  ApiResponse.send(res, { data });
});

const monthlyReport = asyncHandler(async (req, res) => {
  const months = req.query.months ? Number(req.query.months) : undefined;
  const data = await dashboardService.getMonthlyReport({ months });
  ApiResponse.send(res, { data });
});

module.exports = { summary, vendorPerformance, monthlyReport };
