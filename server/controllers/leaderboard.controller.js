const catchAsync = require('../utils/catchAsync');
const leaderboardService = require('../services/leaderboard.service');

exports.rules = catchAsync(async (req, res) => {
  const data = await leaderboardService.getPointRules();
  res.status(200).json({ success: true, data });
});

exports.updateRule = catchAsync(async (req, res) => {
  const data = await leaderboardService.updatePointRule(req.params.action, req.body.points);
  res.status(200).json({ success: true, message: 'Point rule updated.', data });
});

exports.award = catchAsync(async (req, res) => {
  const result = await leaderboardService.awardPoints({
    userId: req.body.userId,
    action: req.body.action,
    eventId: req.body.eventId || null,
    note: req.body.note || null,
  });
  res.status(result.awarded ? 201 : 200).json({
    success: true,
    message: result.awarded ? 'Points awarded.' : `Not awarded: ${result.reason}.`,
    data: result,
  });
});

exports.top = catchAsync(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const data = await leaderboardService.getTopContributors(limit);
  res.status(200).json({ success: true, data });
});

exports.mine = catchAsync(async (req, res) => {
  const data = await leaderboardService.getMyStanding(req.user.id);
  res.status(200).json({ success: true, data });
});
