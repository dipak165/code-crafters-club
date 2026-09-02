const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notification.service');

exports.mine = catchAsync(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const data = await notificationService.listForUser(req.user.id, { unreadOnly });
  res.status(200).json({ success: true, data });
});

exports.markRead = catchAsync(async (req, res) => {
  await notificationService.markRead(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Marked as read.' });
});

exports.markAllRead = catchAsync(async (req, res) => {
  await notificationService.markAllRead(req.user.id);
  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});
