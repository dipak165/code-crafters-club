const catchAsync = require('../utils/catchAsync');
const announcementService = require('../services/announcement.service');

exports.listPublished = catchAsync(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const data = await announcementService.listPublished(limit);
  res.status(200).json({ success: true, data });
});

exports.getPublishedById = catchAsync(async (req, res) => {
  const data = await announcementService.getPublishedById(req.params.id);
  res.status(200).json({ success: true, data });
});

exports.listAll = catchAsync(async (req, res) => {
  const data = await announcementService.listAll();
  res.status(200).json({ success: true, data });
});

exports.create = catchAsync(async (req, res) => {
  const data = await announcementService.create(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Announcement saved.', data });
});

exports.update = catchAsync(async (req, res) => {
  const data = await announcementService.update(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Announcement updated.', data });
});

exports.remove = catchAsync(async (req, res) => {
  await announcementService.remove(req.params.id);
  res.status(200).json({ success: true, message: 'Announcement deleted.' });
});
