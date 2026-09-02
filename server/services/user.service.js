const prisma = require('../config/db');
const AppError = require('../utils/AppError');

async function search({ query, page = 1, limit = 20 } = {}) {
  const where = query
    ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] }
    : {};

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, collegeName: true, graduationYear: true, emailVerified: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

// Business rule (spec section 69, #12): "Users cannot change their own
// role." This applies even to a Super Admin acting on their own
// account — self-promotion/demotion must always go through a
// different Super Admin, so a single compromised or careless account
// can't unilaterally escalate itself.
async function updateRole(targetUserId, newRole, actingUserId) {
  if (targetUserId === actingUserId) {
    throw new AppError('You cannot change your own role.', 403);
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new AppError('User not found.', 404);

  return prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
    select: { id: true, name: true, email: true, role: true },
  });
}

module.exports = { search, updateRole };
