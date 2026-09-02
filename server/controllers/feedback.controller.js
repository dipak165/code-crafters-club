const catchAsync = require('../utils/catchAsync');
const feedbackService = require('../services/feedback.service');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');

exports.submit = catchAsync(async (req, res) => {
  const feedback = await feedbackService.submit(req.user.id, req.params.slug, req.body);
  res.status(201).json({ success: true, message: 'Thanks for your feedback!', data: feedback });
});

exports.mine = catchAsync(async (req, res) => {
  const feedback = await feedbackService.getMyFeedback(req.user.id, req.params.slug);
  res.status(200).json({ success: true, data: feedback });
});

exports.publicSummary = catchAsync(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) throw new AppError('Event not found.', 404);
  const data = await feedbackService.getPublicSummary(event.id);
  res.status(200).json({ success: true, data });
});

exports.staffDetail = catchAsync(async (req, res) => {
  const data = await feedbackService.getStaffDetail(req.params.eventId);
  res.status(200).json({ success: true, data });
});
