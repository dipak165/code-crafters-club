const path = require('path');
const catchAsync = require('../utils/catchAsync');
const recruitmentService = require('../services/recruitment.service');
const AppError = require('../utils/AppError');

exports.apply = catchAsync(async (req, res) => {
  const resumeFile = req.file;
  const application = await recruitmentService.apply(
    { ...req.body, resumeUrl: resumeFile ? `local:${resumeFile.filename}` : undefined },
    req.user?.id
  );
  res.status(201).json({
    success: true,
    message: 'Application submitted! Check your email for confirmation.',
    data: { id: application.id },
  });
});

exports.listAll = catchAsync(async (req, res) => {
  const { status, team, page, limit } = req.query;
  const result = await recruitmentService.listAll({
    status,
    team,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 30,
  });
  res.status(200).json({ success: true, ...result });
});

exports.getById = catchAsync(async (req, res) => {
  const data = await recruitmentService.getById(req.params.id);
  res.status(200).json({ success: true, data });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const data = await recruitmentService.updateStatus(req.params.id, req.body.status);
  res.status(200).json({ success: true, message: 'Application status updated.', data });
});

exports.downloadResume = catchAsync(async (req, res) => {
  const stored = await recruitmentService.getResumePath(req.params.id, req.user);
  if (!stored.startsWith('local:')) throw new AppError('Resume not available.', 404);
  const { RECRUITMENT_STORAGE_DIR } = require('../middleware/upload.middleware');
  const filePath = path.join(RECRUITMENT_STORAGE_DIR, stored.replace('local:', ''));
  res.download(filePath);
});
