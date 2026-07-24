const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const uploadService = require('../services/upload.service');

const presign = asyncHandler(async (req, res) => {
  const result = await uploadService.createPresignedUpload(req.body);
  ApiResponse.send(res, { data: result });
});

const viewUrl = asyncHandler(async (req, res) => {
  // fileKey is a query param, not a path param — it contains slashes
  // (module/YYYY/MM/uuid-filename) which would otherwise split across
  // Express route segments.
  const result = await uploadService.getViewUrl(req.query.fileKey);
  ApiResponse.send(res, { data: result });
});

module.exports = { presign, viewUrl };
