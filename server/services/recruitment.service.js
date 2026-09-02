const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { sendMail } = require('../utils/email.util');

// Every status transition an applicant can move through, in order —
// used only to write a sensible status-change email, not to enforce
// a strict forward-only state machine (staff may need to bounce
// someone back from INTERVIEW to UNDER_REVIEW, and that's fine).
const STATUS_LABELS = {
  APPLIED: 'received',
  UNDER_REVIEW: 'under review',
  SHORTLISTED: 'shortlisted',
  INTERVIEW: 'moved to the interview stage',
  SELECTED: 'selected — welcome to the team!',
  REJECTED: 'not selected this time',
};

async function apply(input, userId) {
  const application = await prisma.recruitmentApplication.create({
    data: {
      userId: userId || null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      graduationYear: input.graduationYear,
      skills: input.skills,
      teamPreference: input.teamPreference,
      motivation: input.motivation,
      experience: input.experience || null,
      githubUrl: input.githubUrl || null,
      linkedinUrl: input.linkedinUrl || null,
      resumeUrl: input.resumeUrl || null,
    },
  });

  await sendMail({
    to: application.email,
    subject: 'Application received — Code Crafters Club',
    html: `<p>Hi ${application.name},</p><p>Thanks for applying to join the Code Crafters Club ${application.teamPreference.replace('_', ' ')}. We've received your application and will be in touch soon.</p>`,
  }).catch(() => {});

  return application;
}

async function listAll({ status, team, page = 1, limit = 30 } = {}) {
  const where = {};
  if (status) where.status = status;
  if (team) where.teamPreference = team;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.recruitmentApplication.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.recruitmentApplication.count({ where }),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function getById(id) {
  const application = await prisma.recruitmentApplication.findUnique({ where: { id } });
  if (!application) throw new AppError('Application not found.', 404);
  return application;
}

async function updateStatus(id, status) {
  const application = await prisma.recruitmentApplication.findUnique({ where: { id } });
  if (!application) throw new AppError('Application not found.', 404);

  const updated = await prisma.recruitmentApplication.update({ where: { id }, data: { status } });

  const label = STATUS_LABELS[status] || status.toLowerCase();
  await sendMail({
    to: updated.email,
    subject: `Your Code Crafters Club application: ${label}`,
    html: `<p>Hi ${updated.name},</p><p>Your application for the ${updated.teamPreference.replace('_', ' ')} team is now <strong>${label}</strong>.</p>`,
  }).catch(() => {});

  return updated;
}

async function getResumePath(id, requestingUser) {
  const application = await prisma.recruitmentApplication.findUnique({ where: { id } });
  if (!application || !application.resumeUrl) throw new AppError('Resume not found.', 404);

  // Same principle as club member CVs: only staff (who have
  // MANAGE_RECRUITMENT to even reach this route) or the applicant's
  // own account may fetch it — enforced here, not just by hiding a link.
  const isStaff = ['TECHNICAL_TEAM', 'SUPER_ADMIN'].includes(requestingUser.role);
  const isSelf = application.userId && application.userId === requestingUser.id;
  if (!isStaff && !isSelf) {
    throw new AppError('You do not have permission to view this resume.', 403);
  }

  return application.resumeUrl;
}

module.exports = { apply, listAll, getById, updateStatus, getResumePath };
