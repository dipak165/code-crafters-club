const catchAsync = require('../utils/catchAsync');
const certificateService = require('../services/certificate.service');
const { logAction } = require('../utils/auditLog.util');

exports.generateForEvent = catchAsync(async (req, res) => {
  const result = await certificateService.generateForEvent(req.params.eventId);
  logAction({
    userId: req.user.id,
    action: 'GENERATE_CERTIFICATES',
    entity: 'Event',
    entityId: req.params.eventId,
    ipAddress: req.ip,
  });
  res.status(200).json({
    success: true,
    message: `${result.issued} certificate(s) issued, ${result.skipped} already existed.`,
    data: result,
  });
});

exports.myCertificates = catchAsync(async (req, res) => {
  const certificates = await certificateService.getMyCertificates(req.user.id);
  res.status(200).json({ success: true, data: certificates });
});

exports.download = catchAsync(async (req, res) => {
  const buffer = await certificateService.getCertificateFile(req.params.code, req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.code}.pdf"`);
  res.send(buffer);
});

exports.verify = catchAsync(async (req, res) => {
  const result = await certificateService.verifyCertificate(req.params.code);
  res.status(200).json({ success: true, data: result });
});
