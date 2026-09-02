const prisma = require('../config/db');

async function getOverview() {
  const currentYear = new Date().getFullYear();

  const [
    totalStudents,
    totalEvents,
    upcomingEvents,
    completedEvents,
    totalRegistrations,
    revenueAgg,
    certificatesIssued,
    currentClubMembers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', emailVerified: true } }),
    prisma.event.count(),
    prisma.event.count({
      where: { eventDate: { gte: new Date() }, status: { in: ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'] } },
    }),
    prisma.event.count({ where: { status: 'COMPLETED' } }),
    prisma.eventRegistration.count({ where: { status: 'CONFIRMED' } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.certificate.count(),
    prisma.clubMember.count({ where: { leftAt: null, clubYear: { year: currentYear } } }),
  ]);

  return {
    totalStudents,
    totalEvents,
    upcomingEvents,
    completedEvents,
    totalRegistrations,
    totalRevenue: Number(revenueAgg._sum.amount || 0),
    certificatesIssued,
    currentClubMembers,
  };
}

// Bucketed in JS rather than a DB-level date-trunc — keeps this
// portable across Postgres/MySQL without raw SQL, and the data
// volumes a college club deals with make this a non-issue.
async function getRegistrationsByMonth(monthsBack = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsBack - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const registrations = await prisma.eventRegistration.findMany({
    where: { status: 'CONFIRMED', registrationDate: { gte: since } },
    select: { registrationDate: true },
  });

  const buckets = new Map();
  for (let i = 0; i < monthsBack; i += 1) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), count: 0 });
  }

  registrations.forEach((r) => {
    const d = new Date(r.registrationDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) buckets.get(key).count += 1;
  });

  return [...buckets.values()];
}

async function getEventsByCategory() {
  const grouped = await prisma.event.groupBy({ by: ['category'], _count: { _all: true } });
  return grouped.map((g) => ({ category: g.category, count: g._count._all }));
}

async function getRevenueByEvent() {
  const grouped = await prisma.payment.groupBy({
    by: ['eventId'],
    where: { status: 'PAID' },
    _sum: { amount: true },
  });

  const events = await prisma.event.findMany({
    where: { id: { in: grouped.map((g) => g.eventId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(events.map((e) => [e.id, e.title]));

  return grouped
    .map((g) => ({ eventTitle: titleById.get(g.eventId) || 'Unknown', revenue: Number(g._sum.amount || 0) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

async function getStudentsByGraduationYear() {
  const grouped = await prisma.user.groupBy({
    by: ['graduationYear'],
    where: { role: 'STUDENT' },
    _count: { _all: true },
  });
  return grouped
    .map((g) => ({ year: g.graduationYear, count: g._count._all }))
    .sort((a, b) => a.year - b.year);
}

module.exports = {
  getOverview,
  getRegistrationsByMonth,
  getEventsByCategory,
  getRevenueByEvent,
  getStudentsByGraduationYear,
};
