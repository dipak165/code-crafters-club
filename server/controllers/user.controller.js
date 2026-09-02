const catchAsync = require('../utils/catchAsync');
const userService = require('../services/user.service');
const { logAction } = require('../utils/auditLog.util');

exports.search = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await userService.search({
    query: q,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });
  res.status(200).json({ success: true, ...result });
});

exports.updateRole = catchAsync(async (req, res) => {
  const updated = await userService.updateRole(req.params.id, req.body.role, req.user.id);
  logAction({
    userId: req.user.id,
    action: 'CHANGE_USER_ROLE',
    entity: 'User',
    entityId: updated.id,
    ipAddress: req.ip,
  });
  res.status(200).json({ success: true, message: `Role updated to ${updated.role}.`, data: updated });
});
