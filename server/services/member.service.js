const prisma = require('../config/db');
const AppError = require('../utils/AppError');

const TEAM_ROLES = [
  'PRESIDENT',
  'VICE_PRESIDENT',
  'TECHNICAL_TEAM',
  'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM',
  'CONTENT_TEAM',
  'MARKETING_TEAM',
];

// --- helpers -----------------------------------------------------

async function getOrCreateClubYear(year) {
  return prisma.clubYear.upsert({
    where: { year },
    update: {},
    create: { year, description: `Code Crafters Club — ${year} batch` },
  });
}

// Strips contact info and CV link from a member record unless the
// member has explicitly opted in (showContact) — business rule from
// spec section 24: "Phone numbers and email addresses should not
// necessarily be publicly exposed."
function toPublicMember(member) {
  const base = {
    id: member.id,
    name: member.user.name,
    team: member.team,
    position: member.position,
    skills: member.skills,
    description: member.description,
    profileImage: member.user.profileImageUrl ? `/api/members/${member.id}/photo` : null,
    linkedinUrl: member.linkedinUrl,
    githubUrl: member.githubUrl,
    portfolioUrl: member.portfolioUrl,
  };
  if (member.showContact) {
    base.email = member.user.email;
    base.phone = member.user.phone;
    base.cvUrl = member.cvUrl ? `/api/members/${member.id}/cv` : null;
  }
  return base;
}

// --- public reads ----------------------------------------------------

async function listYears() {
  const years = await prisma.clubYear.findMany({ orderBy: { year: 'desc' }, select: { year: true } });
  return years.map((y) => y.year);
}

async function getMembersByYear(year) {
  const clubYear = await prisma.clubYear.findUnique({ where: { year: Number(year) } });
  if (!clubYear) return { year: Number(year), members: [] };

  const members = await prisma.clubMember.findMany({
    where: { clubYearId: clubYear.id, leftAt: null },
    include: { user: { select: { name: true, email: true, phone: true, profileImageUrl: true } } },
    orderBy: [{ team: 'asc' }],
  });

  return { year: clubYear.year, members: members.map(toPublicMember) };
}

// --- staff writes ------------------------------------------------

async function addMember(input) {
  if (!TEAM_ROLES.includes(input.team)) {
    throw new AppError('Invalid team.', 400);
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('No registered student found with that email. They must sign up first.', 404);
  }

  const clubYear = await getOrCreateClubYear(Number(input.year));

  const existing = await prisma.clubMember.findUnique({
    where: { userId_clubYearId: { userId: user.id, clubYearId: clubYear.id } },
  });
  if (existing) {
    throw new AppError('This student is already a club member for this year.', 409);
  }

  return prisma.clubMember.create({
    data: {
      userId: user.id,
      clubYearId: clubYear.id,
      team: input.team,
      position: input.position,
      skills: input.skills || [],
      description: input.description || null,
      linkedinUrl: input.linkedinUrl || null,
      githubUrl: input.githubUrl || null,
      portfolioUrl: input.portfolioUrl || null,
      showContact: input.showContact ?? false,
      cvUrl: input.cvUrl || null,
    },
  });
}

// Profile photos live on User (the account-level avatar), not on the
// year-scoped ClubMember row — a student's photo doesn't change
// per-year, so it's set once here rather than duplicated per year.
async function setProfileImage(userId, profileImageUrl) {
  return prisma.user.update({ where: { id: userId }, data: { profileImageUrl } });
}

async function updateMember(memberId, input) {
  const member = await prisma.clubMember.findUnique({ where: { id: memberId } });
  if (!member) throw new AppError('Club member record not found.', 404);

  return prisma.clubMember.update({
    where: { id: memberId },
    data: {
      team: input.team ?? undefined,
      position: input.position ?? undefined,
      skills: input.skills ?? undefined,
      description: input.description ?? undefined,
      linkedinUrl: input.linkedinUrl ?? undefined,
      githubUrl: input.githubUrl ?? undefined,
      portfolioUrl: input.portfolioUrl ?? undefined,
      showContact: input.showContact ?? undefined,
      cvUrl: input.cvUrl ?? undefined,
    },
  });
}

// Removes a member from a specific year's roster only. Since
// membership is year-scoped by design, this can never touch — let
// alone overwrite — any other year's ClubMember rows (business rule
// 8: previous-year records must never be accidentally overwritten).
async function removeMemberFromYear(memberId) {
  const member = await prisma.clubMember.findUnique({ where: { id: memberId } });
  if (!member) throw new AppError('Club member record not found.', 404);

  return prisma.clubMember.update({ where: { id: memberId }, data: { leftAt: new Date() } });
}

async function getCvPath(memberId, requestingUser) {
  const member = await prisma.clubMember.findUnique({ where: { id: memberId } });
  if (!member || !member.cvUrl) throw new AppError('CV not found.', 404);

  // Hiding the download link from API responses when showContact is
  // false isn't real access control on its own — a member ID isn't
  // secret, so the route itself must enforce the same rule.
  const isStaff = requestingUser && ['TECHNICAL_TEAM', 'SUPER_ADMIN'].includes(requestingUser.role);
  const isSelf = requestingUser && requestingUser.id === member.userId;
  if (!member.showContact && !isStaff && !isSelf) {
    throw new AppError('This CV is not publicly available.', 403);
  }

  return member.cvUrl;
}

async function getProfileImagePath(memberId) {
  const member = await prisma.clubMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { profileImageUrl: true } } },
  });
  if (!member || !member.user.profileImageUrl) throw new AppError('No profile photo found.', 404);
  return member.user.profileImageUrl;
}

module.exports = {
  TEAM_ROLES,
  listYears,
  getMembersByYear,
  addMember,
  updateMember,
  removeMemberFromYear,
  getCvPath,
  getProfileImagePath,
  setProfileImage,
};
