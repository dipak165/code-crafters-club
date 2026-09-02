const catchAsync = require('../utils/catchAsync');
const registrationService = require('../services/registration.service');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');

exports.register = catchAsync(async (req, res) => {
  const result = await registrationService.registerForEvent(req.user.id, req.params.slug);
  const message =
    result.status === 'WAITLISTED'
      ? `Event is full — you're #${result.position} on the waitlist.`
      : 'Registration confirmed! Check your email for details.';
  res.status(201).json({ success: true, message, data: result });
});

exports.cancel = catchAsync(async (req, res) => {
  const result = await registrationService.cancelRegistration(req.user.id, req.params.slug);
  res.status(200).json({ success: true, message: 'Registration cancelled.', data: result });
});

exports.myRegistrations = catchAsync(async (req, res) => {
  const result = await registrationService.getMyRegistrations(req.user.id);
  res.status(200).json({ success: true, data: result });
});

exports.eventRegistrations = catchAsync(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
  if (!event) throw new AppError('Event not found.', 404);

  const { page, limit } = req.query;
  const result = await registrationService.getEventRegistrations(event.id, {
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 50,
  });
  res.status(200).json({ success: true, ...result });
});
