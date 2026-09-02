const crypto = require('crypto');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { sendMail, templates } = require('../utils/email.util');

// --- helpers -----------------------------------------------------

function generateRegistrationCode(eventSlug) {
  const shortCode = eventSlug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CCC-${shortCode}-${suffix}`;
}

function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Postgres Serializable isolation makes concurrent conflicting
// transactions fail fast (Prisma surfaces this as error code P2034)
// rather than silently letting both succeed incorrectly. Retrying a
// handful of times means a genuinely conflicting request (two people
// racing for the last seat) resolves correctly on retry instead of
// the loser just seeing a raw 500.
async function runWithSerializableRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable' });
    } catch (err) {
      const isConflict = err.code === 'P2034';
      if (!isConflict || attempt === maxAttempts) throw err;
      // fall through and retry
    }
  }
  return undefined; // unreachable — the loop always returns or throws
}

// --- register ------------------------------------------------------

async function registerForEvent(userId, eventSlug) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) throw new AppError('Event not found.', 404);

  if (event.status !== 'REGISTRATION_OPEN') {
    throw new AppError('Registration is not currently open for this event.', 400);
  }
  if (new Date() > event.registrationDeadline) {
    throw new AppError('The registration deadline for this event has passed.', 400);
  }

  // Business rule: a student cannot register twice — the DB has a
  // unique(userId, eventId) constraint as the source of truth, but
  // we check first so we can give a clean message instead of a
  // raw constraint-violation error.
  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });
  if (existing && existing.status !== 'CANCELLED') {
    throw new AppError('You are already registered for this event.', 409);
  }

  const existingWaitlist = await prisma.eventWaitlist.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });
  if (existingWaitlist && !existingWaitlist.promotedAt) {
    throw new AppError('You are already on the waitlist for this event.', 409);
  }

  // Paid events: Phase 8 (Razorpay) isn't wired yet. Fail clearly
  // rather than creating a registration that can never be confirmed.
  if (Number(event.registrationFee) > 0) {
    throw new AppError(
      'This is a paid event. Online payments are not enabled yet — please check back soon.',
      400
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  // SECURITY/CORRECTNESS: the capacity check ("is there a seat left?")
  // and the write that depends on it ("take the seat" or "join the
  // waitlist") must be atomic together. Without this, two concurrent
  // requests for the very last seat can both read confirmedCount < max
  // before either writes, and both get CONFIRMED — overbooking the
  // event. A Serializable transaction forces Postgres to detect that
  // conflict and fail one of the two attempts, which we retry.
  const outcome = await runWithSerializableRetry(async (tx) => {
    const confirmedCount = await tx.eventRegistration.count({
      where: { eventId: event.id, status: 'CONFIRMED' },
    });

    if (confirmedCount >= event.maxParticipants) {
      const lastPosition = await tx.eventWaitlist.count({ where: { eventId: event.id } });
      const waitlistEntry = await tx.eventWaitlist.create({
        data: { userId, eventId: event.id, position: lastPosition + 1 },
      });
      return { status: 'WAITLISTED', position: waitlistEntry.position };
    }

    const registration = await tx.eventRegistration.upsert({
      where: { userId_eventId: { userId, eventId: event.id } },
      update: {
        status: 'CONFIRMED',
        paymentStatus: 'NOT_APPLICABLE',
        registrationDate: new Date(),
        registrationCode: generateRegistrationCode(event.slug),
        qrToken: generateQrToken(),
      },
      create: {
        userId,
        eventId: event.id,
        status: 'CONFIRMED',
        paymentStatus: 'NOT_APPLICABLE',
        registrationCode: generateRegistrationCode(event.slug),
        qrToken: generateQrToken(),
      },
    });
    return { status: 'CONFIRMED', registration };
  });

  // Side effects (email, in-app notification) happen AFTER the
  // transaction commits, deliberately outside it — holding a
  // Serializable transaction open across a network call to SMTP would
  // needlessly widen the window for conflicts with other registrants.
  if (outcome.status === 'WAITLISTED') {
    await notify(userId, 'Added to waitlist', `You're #${outcome.position} on the waitlist for ${event.title}.`, 'WAITLIST', event.id);
    return outcome;
  }

  const mail = templates.registrationConfirmed(user.name, event.title, outcome.registration.registrationCode);
  await sendMail({ to: user.email, ...mail }).catch(() => {}); // never fail the request over email delivery
  await notify(userId, 'Registration confirmed', `Your registration for ${event.title} is confirmed.`, 'REGISTRATION', event.id);

  return outcome;
}

// --- cancel + waitlist promotion ------------------------------------

async function cancelRegistration(userId, eventSlug) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) throw new AppError('Event not found.', 404);

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });

  const waitlistEntry = await prisma.eventWaitlist.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });

  if ((!registration || registration.status === 'CANCELLED') && !waitlistEntry) {
    throw new AppError('You do not have an active registration for this event.', 404);
  }

  if (waitlistEntry && !waitlistEntry.promotedAt) {
    await prisma.eventWaitlist.delete({ where: { id: waitlistEntry.id } });
    return { status: 'CANCELLED' };
  }

  await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: { status: 'CANCELLED' },
  });

  // Promote the next person on the waitlist into the freed seat.
  const next = await prisma.eventWaitlist.findFirst({
    where: { eventId: event.id, promotedAt: null },
    orderBy: { position: 'asc' },
  });

  if (next) {
    const promotedUser = await prisma.user.findUnique({ where: { id: next.userId } });

    await prisma.eventRegistration.upsert({
      where: { userId_eventId: { userId: next.userId, eventId: event.id } },
      update: {
        status: 'CONFIRMED',
        paymentStatus: 'NOT_APPLICABLE',
        registrationDate: new Date(),
        registrationCode: generateRegistrationCode(event.slug),
        qrToken: generateQrToken(),
      },
      create: {
        userId: next.userId,
        eventId: event.id,
        status: 'CONFIRMED',
        paymentStatus: 'NOT_APPLICABLE',
        registrationCode: generateRegistrationCode(event.slug),
        qrToken: generateQrToken(),
      },
    });

    await prisma.eventWaitlist.update({ where: { id: next.id }, data: { promotedAt: new Date() } });

    const mail = templates.registrationConfirmed(promotedUser.name, event.title, 'promoted from waitlist');
    await sendMail({ to: promotedUser.email, ...mail }).catch(() => {});
    await notify(next.userId, 'You\'re in!', `A seat opened up for ${event.title} — you've been moved from the waitlist to confirmed.`, 'REGISTRATION', event.id);
  }

  return { status: 'CANCELLED' };
}

// --- listings ------------------------------------------------------

async function getMyRegistrations(userId) {
  const registrations = await prisma.eventRegistration.findMany({
    where: { userId, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
    include: { event: true },
    orderBy: { registrationDate: 'desc' },
  });

  const waitlisted = await prisma.eventWaitlist.findMany({
    where: { userId, promotedAt: null },
    include: { event: true },
    orderBy: { createdAt: 'desc' },
  });

  return { registrations, waitlisted };
}

async function getEventRegistrations(eventId, { page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { eventId, status: { not: 'CANCELLED' } },
      include: { user: { select: { id: true, name: true, email: true, phone: true, collegeName: true, graduationYear: true } } },
      orderBy: { registrationDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.eventRegistration.count({ where: { eventId, status: { not: 'CANCELLED' } } }),
  ]);
  return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

// --- internal --------------------------------------------------------

async function notify(userId, title, message, type, eventId) {
  await prisma.notification.create({ data: { userId, title, message, type, eventId } }).catch(() => {});
}

module.exports = {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
};
