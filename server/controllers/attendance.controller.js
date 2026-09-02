const catchAsync = require('../utils/catchAsync');
const attendanceService = require('../services/attendance.service');

exports.checkIn = catchAsync(async (req, res) => {
  const result = await attendanceService.checkIn(req.user.id, req.params.eventId, req.body.qrToken);
  res.status(200).json({ success: true, message: `Checked in: ${result.studentName}`, data: result });
});

exports.summary = catchAsync(async (req, res) => {
  const result = await attendanceService.getAttendanceSummary(req.params.eventId);
  res.status(200).json({ success: true, data: result });
});
