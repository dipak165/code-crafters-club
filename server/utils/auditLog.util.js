const prisma = require('../config/db');

// Fire-and-forget by design: an audit-log write failing should never
// block or fail the actual admin action it's recording. This mirrors
// the same pattern used for email sending throughout the app —
// logging/notifying is a side effect, not a precondition for success.
async function logAction({ userId, action, entity, entityId, ipAddress }) {
  // A plain `.catch()` chained onto `.create()` only guards against
  // the promise rejecting — it does nothing if `prisma.auditLog`
  // itself is unavailable (misconfigured client, a mocked/partial
  // Prisma instance in a test, a migration not yet applied), since
  // that throws synchronously before any promise even exists. This
  // function's whole reason to exist is "never block the real admin
  // action it's recording," so the guard has to be a real try/catch.
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId: entityId || null, ipAddress: ipAddress || null },
    });
  } catch (err) {
    // Intentionally swallowed — see comment above.
  }
}

async function listAuditLogs({ page = 1, limit = 50, entity } = {}) {
  const where = entity ? { entity } : {};
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

module.exports = { logAction, listAuditLogs };
