const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.query.parsed;
  const { items, total } = await notificationService.listForUser(req.user._id, { page, limit, unreadOnly: req.query.unreadOnly === 'true' });
  ApiResponse.send(res, { data: items, meta: { page, limit, total } });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.user._id);
  ApiResponse.send(res, { data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  ApiResponse.send(res, { data: { updated: true } });
});

module.exports = { list, markRead, markAllRead };
