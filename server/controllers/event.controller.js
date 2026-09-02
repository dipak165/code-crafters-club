const catchAsync = require('../utils/catchAsync');
const eventService = require('../services/event.service');
const { logAction } = require('../utils/auditLog.util');

exports.list = catchAsync(async (req, res) => {
  const { page, limit, category, mode, upcoming, year, search } = req.query;
  const canSeeDrafts = !!req.user && req.user.role !== 'STUDENT';

  const result = await eventService.listEvents({
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 12,
    category,
    mode,
    upcoming: upcoming === 'true' ? true : upcoming === 'false' ? false : undefined,
    year,
    search,
    includeDrafts: canSeeDrafts,
  });

  res.status(200).json({ success: true, ...result });
});

exports.getBySlug = catchAsync(async (req, res) => {
  const canSeeDrafts = !!req.user && req.user.role !== 'STUDENT';
  const event = await eventService.getEventBySlug(req.params.slug, { includeDrafts: canSeeDrafts });
  res.status(200).json({ success: true, data: event });
});

exports.create = catchAsync(async (req, res) => {
  const event = await eventService.createEvent(req.body, req.user.id);
  logAction({ userId: req.user.id, action: 'CREATE_EVENT', entity: 'Event', entityId: event.id, ipAddress: req.ip });
  res.status(201).json({ success: true, message: 'Event created.', data: event });
});

exports.update = catchAsync(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.body);
  logAction({ userId: req.user.id, action: 'EDIT_EVENT', entity: 'Event', entityId: event.id, ipAddress: req.ip });
  res.status(200).json({ success: true, message: 'Event updated.', data: event });
});

exports.remove = catchAsync(async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  logAction({ userId: req.user.id, action: 'DELETE_EVENT', entity: 'Event', entityId: req.params.id, ipAddress: req.ip });
  res.status(200).json({ success: true, message: 'Event removed.' });
});

exports.clubStats = catchAsync(async (req, res) => {
  const stats = await eventService.getClubStats();
  res.status(200).json({ success: true, data: stats });
});
