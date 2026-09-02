const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// Maps an event's category to the point-rule action that applies to
// it — the spec gives workshops and hackathons different point
// values than generic "event participation," so this can't be a
// single flat award regardless of what kind of event it was.
function actionForEventCategory(category) {
  if (category === 'HACKATHON') return 'HACKATHON';
  if (category === 'WORKSHOP') return 'WORKSHOP';
  return 'EVENT_PARTICIPATION';
}

// --- point rules (admin-configurable) --------------------------

async function getPointRules() {
  return prisma.pointRule.findMany({ orderBy: { action: 'asc' } });
}

async function updatePointRule(action, points) {
  const existing = await prisma.pointRule.findUnique({ where: { action } });
  if (!existing) throw new AppError(`No point rule exists for action "${action}".`, 404);
  return prisma.pointRule.update({ where: { action }, data: { points } });
}

// --- awarding points --------------------------------------------

// The single entry point for every way points get awarded — QR
// check-in, certificate issuance, and manual staff awards all call
// this, so the idempotency guard and point-value lookup only need
// to exist in one place.
async function awardPoints({ userId, action, eventId = null, note = null }) {
  const rule = await prisma.pointRule.findUnique({ where: { action } });
  if (!rule) throw new AppError(`No point rule exists for action "${action}".`, 400);

  // Idempotency: for event-tied actions (check-in, certificate),
  // don't award the same action twice for the same student+event —
  // e.g. if certificate generation were somehow re-run. Actions
  // without an eventId (a manual "volunteering" award with no
  // specific event) have no natural dedup key and are allowed to
  // recur, since staff are knowingly triggering each one individually.
  if (eventId) {
    const existing = await prisma.pointLedger.findFirst({ where: { userId, eventId, action } });
    if (existing) {
      return { awarded: false, reason: 'already awarded for this event' };
    }
  }

  const entry = await prisma.pointLedger.create({
    data: { userId, action, points: rule.points, eventId, note },
  });

  return { awarded: true, entry };
}

async function awardForEventCheckIn(userId, eventId, eventCategory) {
  return awardPoints({ userId, action: actionForEventCategory(eventCategory), eventId });
}

async function awardForCertificate(userId, eventId) {
  return awardPoints({ userId, action: 'CERTIFICATE', eventId });
}

// --- leaderboard reads ----------------------------------------------

async function getTopContributors(limit = 20) {
  const grouped = await prisma.pointLedger.groupBy({
    by: ['userId'],
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: limit,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, profileImageUrl: true, graduationYear: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped
    .filter((g) => userById.has(g.userId)) // guard against a stale ledger row for a deleted user
    .map((g, i) => ({
      rank: i + 1,
      userId: g.userId,
      name: userById.get(g.userId).name,
      graduationYear: userById.get(g.userId).graduationYear,
      totalPoints: g._sum.points,
    }));
}

async function getMyStanding(userId) {
  const myTotal = await prisma.pointLedger.aggregate({ where: { userId }, _sum: { points: true } });
  const totalPoints = myTotal._sum.points || 0;

  if (totalPoints === 0) {
    return { totalPoints: 0, rank: null };
  }

  // Rank = 1 + count of students with strictly more points than me.
  // Computed from the same groupBy the public leaderboard uses, so
  // "my rank" and "the leaderboard order" can never disagree.
  const allTotals = await prisma.pointLedger.groupBy({ by: ['userId'], _sum: { points: true } });
  const ahead = allTotals.filter((t) => (t._sum.points || 0) > totalPoints).length;

  return { totalPoints, rank: ahead + 1 };
}

module.exports = {
  getPointRules,
  updatePointRule,
  awardPoints,
  awardForEventCheckIn,
  awardForCertificate,
  getTopContributors,
  getMyStanding,
};
