const path = require('path');
const catchAsync = require('../utils/catchAsync');
const memberService = require('../services/member.service');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/auditLog.util');

function fileUrl(memberId, kind) {
  return `/api/members/${memberId}/${kind}`;
}

exports.years = catchAsync(async (req, res) => {
  const years = await memberService.listYears();
  res.status(200).json({ success: true, data: years });
});

exports.byYear = catchAsync(async (req, res) => {
  const result = await memberService.getMembersByYear(req.params.year);
  res.status(200).json({ success: true, data: result });
});

exports.add = catchAsync(async (req, res) => {
  const cvFile = req.files?.cv?.[0];
  const imageFile = req.files?.profileImage?.[0];

  const member = await memberService.addMember({
    ...req.body,
    cvUrl: cvFile ? `local:${cvFile.filename}` : undefined,
  });

  if (imageFile) {
    await memberService.setProfileImage(member.userId, `local:${imageFile.filename}`);
  }

  logAction({ userId: req.user.id, action: 'ADD_MEMBER', entity: 'ClubMember', entityId: member.id, ipAddress: req.ip });
  res.status(201).json({ success: true, message: 'Club member added.', data: member });
});

exports.update = catchAsync(async (req, res) => {
  const cvFile = req.files?.cv?.[0];
  const imageFile = req.files?.profileImage?.[0];

  const member = await memberService.updateMember(req.params.id, {
    ...req.body,
    ...(cvFile ? { cvUrl: `local:${cvFile.filename}` } : {}),
  });

  if (imageFile) {
    await memberService.setProfileImage(member.userId, `local:${imageFile.filename}`);
  }

  logAction({ userId: req.user.id, action: 'EDIT_MEMBER', entity: 'ClubMember', entityId: member.id, ipAddress: req.ip });
  res.status(200).json({ success: true, message: 'Club member updated.', data: member });
});

exports.remove = catchAsync(async (req, res) => {
  await memberService.removeMemberFromYear(req.params.id);
  logAction({ userId: req.user.id, action: 'REMOVE_MEMBER', entity: 'ClubMember', entityId: req.params.id, ipAddress: req.ip });
  res.status(200).json({ success: true, message: 'Member removed from this year\'s roster.' });
});

exports.downloadCv = catchAsync(async (req, res) => {
  const stored = await memberService.getCvPath(req.params.id, req.user);
  if (!stored.startsWith('local:')) throw new AppError('CV not available.', 404);
  const { STORAGE_DIR } = require('../middleware/upload.middleware');
  const filePath = path.join(STORAGE_DIR, stored.replace('local:', ''));
  res.download(filePath);
});

exports.photo = catchAsync(async (req, res) => {
  const stored = await memberService.getProfileImagePath(req.params.id);
  if (!stored.startsWith('local:')) throw new AppError('Photo not available.', 404);
  const { STORAGE_DIR } = require('../middleware/upload.middleware');
  const filePath = path.join(STORAGE_DIR, stored.replace('local:', ''));
  res.sendFile(filePath);
});
