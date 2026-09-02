const catchAsync = require('../utils/catchAsync');
const analyticsService = require('../services/analytics.service');

exports.overview = catchAsync(async (req, res) => {
  const data = await analyticsService.getOverview();
  res.status(200).json({ success: true, data });
});

exports.registrationsByMonth = catchAsync(async (req, res) => {
  const months = req.query.months ? parseInt(req.query.months, 10) : 6;
  const data = await analyticsService.getRegistrationsByMonth(months);
  res.status(200).json({ success: true, data });
});

exports.eventsByCategory = catchAsync(async (req, res) => {
  const data = await analyticsService.getEventsByCategory();
  res.status(200).json({ success: true, data });
});

exports.revenueByEvent = catchAsync(async (req, res) => {
  const data = await analyticsService.getRevenueByEvent();
  res.status(200).json({ success: true, data });
});

exports.studentsByGraduationYear = catchAsync(async (req, res) => {
  const data = await analyticsService.getStudentsByGraduationYear();
  res.status(200).json({ success: true, data });
});
