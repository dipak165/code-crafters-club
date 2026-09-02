const prisma = require('../config/db');
const AppError = require('../utils/AppError');

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Public-facing statuses: what an anonymous / student visitor is
// allowed to see. DRAFT events are only visible to their creators
// / technical team — this is enforced here, not just hidden in UI.
const PUBLIC_STATUSES = [
  'PUBLISHED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'ONGOING',
  'COMPLETED',
];

async function listEvents({ page = 1, limit = 12, category, mode, upcoming, year, search, includeDrafts = false }) {
  const where = {};
  if (!includeDrafts) where.status = { in: PUBLIC_STATUSES };
  if (category) where.category = category;
  if (mode) where.mode = mode;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  if (upcoming === true) {
    where.eventDate = { gte: new Date() };
    where.status = { in: ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'] };
  } else if (upcoming === false) {
    where.OR = [{ eventDate: { lt: new Date() } }, { status: 'COMPLETED' }];
  }

  if (year) {
    where.eventDate = {
      ...(where.eventDate || {}),
      gte: new Date(`${year}-01-01T00:00:00.000Z`),
      lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
    };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { eventDate: upcoming === false ? 'desc' : 'asc' },
      skip,
      take: limit,
      include: {
        _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const data = items.map((e) => ({
    ...e,
    seatsRemaining: e.maxParticipants - e._count.registrations,
  }));

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

async function getEventBySlug(slug, { includeDrafts = false } = {}) {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      createdBy: { select: { id: true, name: true } },
      gallery: true,
      winners: true,
      _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
    },
  });

  if (!event) throw new AppError('Event not found.', 404);
  if (!includeDrafts && !PUBLIC_STATUSES.includes(event.status)) {
    throw new AppError('Event not found.', 404);
  }

  return { ...event, seatsRemaining: event.maxParticipants - event._count.registrations };
}

async function createEvent(input, creatorId) {
  const baseSlug = slugify(input.title);
  let slug = baseSlug;
  let suffix = 1;
  // Ensure slug uniqueness without failing the request on collision.
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  return prisma.event.create({
    data: { ...input, slug, createdById: creatorId },
  });
}

async function updateEvent(id, input) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError('Event not found.', 404);

  return prisma.event.update({ where: { id }, data: input });
}

async function deleteEvent(id) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw new AppError('Event not found.', 404);

  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: id, status: 'CONFIRMED' },
  });
  if (confirmedCount > 0) {
    // Don't hard-delete an event people already registered/paid for —
    // cancel it instead so history and payment records stay intact.
    const cancelled = await prisma.event.update({ where: { id }, data: { status: 'CANCELLED' } });
    // Lazy require avoids a circular dependency at module-load time
    // (notification.service.js doesn't need event.service.js, but
    // requiring it at the top of this file for one call isn't worth
    // the coupling either).
    require('./notification.service').notifyEventCancelled(id).catch(() => {});
    return cancelled;
  }

  return prisma.event.delete({ where: { id } });
}

async function getClubStats() {
  const [students, events, workshops, certificates, hackathons] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT', emailVerified: true } }),
    prisma.event.count({ where: { status: 'COMPLETED' } }),
    prisma.event.count({ where: { status: 'COMPLETED', category: 'WORKSHOP' } }),
    prisma.certificate.count(),
    prisma.event.count({ where: { status: 'COMPLETED', category: 'HACKATHON' } }),
  ]);
  return { students, events, workshops, certificates, hackathons };
}

module.exports = {
  listEvents,
  getEventBySlug,
  createEvent,
  updateEvent,
  deleteEvent,
  getClubStats,
  PUBLIC_STATUSES,
};
