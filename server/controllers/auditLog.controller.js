const catchAsync = require('../utils/catchAsync');
const { listAuditLogs } = require('../utils/auditLog.util');

exports.list = catchAsync(async (req, res) => {
  const { page, limit, entity } = req.query;
  const result = await listAuditLogs({
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 50,
    entity,
  });
  res.status(200).json({ success: true, ...result });
});
