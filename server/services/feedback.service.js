const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// --- submit ------------------------------------------------------

async function submit(userId, eventSlug, input) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) throw new AppError('Event not found.', 404);

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });

  // Business rule: feedback is only meaningful from people who
  // actually showed up — gated on the same attendanceStatus that QR
  // check-in (Phase 9) sets, not merely on having registered.
  if (!registration || registration.attendanceStatus !== 'PRESENT') {
    throw new AppError('Only students who attended this event can leave feedback.', 403);
  }

  const existing = await prisma.eventFeedback.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
  if (existing) {
    throw new AppError('You have already submitted feedback for this event.', 409);
  }

  return prisma.eventFeedback.create({
    data: {
      eventId: event.id,
      userId,
      rating: input.rating,
      speakerRating: input.speakerRating || null,
      organizationRating: input.organizationRating || null,
      comments: input.comments || null,
      suggestions: input.suggestions || null,
    },
  });
}

async function getMyFeedback(userId, eventSlug) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) throw new AppError('Event not found.', 404);

  return prisma.eventFeedback.findUnique({
    where: { eventId_userId: { eventId: event.id, userId } },
  });
}

// --- public: aggregate only, never individual comments -----------

async function getPublicSummary(eventId) {
  const agg = await prisma.eventFeedback.aggregate({
    where: { eventId },
    _avg: { rating: true, speakerRating: true, organizationRating: true },
    _count: { _all: true },
  });

  return {
    count: agg._count._all,
    avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : null,
    avgSpeakerRating: agg._avg.speakerRating ? Number(agg._avg.speakerRating.toFixed(1)) : null,
    avgOrganizationRating: agg._avg.organizationRating ? Number(agg._avg.organizationRating.toFixed(1)) : null,
  };
}

// --- staff: full detail including comments/suggestions ------------

async function getStaffDetail(eventId) {
  const [summary, entries] = await Promise.all([
    getPublicSummary(eventId),
    prisma.eventFeedback.findMany({
      where: { eventId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { summary, entries };
}

module.exports = { submit, getMyFeedback, getPublicSummary, getStaffDetail };
