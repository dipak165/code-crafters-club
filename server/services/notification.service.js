const prisma = require('../config/db');
const { sendMail, templates } = require('../utils/email.util');

// Lead times for the three reminder types the spec calls for
// (section 42), expressed as bands rather than open-ended
// thresholds. A naive "hoursUntilStart <= hoursBefore" check would
// fire EVERY tier at once for an event created less than 7 days out
// — e.g. an event 20 hours away would trigger both the 7-day AND
// 1-day reminder simultaneously, sending a factually wrong "in 7
// days" message for something actually happening tomorrow. Each
// tier only fires within its own band, so only the tier that
// actually matches reality goes out.
const REMINDER_WINDOWS = [
  { type: 'REMINDER_7D', hoursBefore: 24 * 7, bandLowerBound: 24, label: 'in 7 days' },
  { type: 'REMINDER_1D', hoursBefore: 24, bandLowerBound: 1, label: 'tomorrow' },
  { type: 'REMINDER_1H', hoursBefore: 1, bandLowerBound: 0, label: 'in about an hour' },
];

// --- scheduled reminders --------------------------------------------

// Idempotency strategy: rather than trying to fire exactly when an
// event crosses a threshold (fragile — a missed cron run, a server
// restart, or a slow query means the exact instant is gone forever),
// this checks "should this reminder have gone out by now, and has it
// NOT already been sent" every time it runs. That's safe to call as
// often as you like, from a cron job with any interval, and safe to
// have missed a few runs.
async function runEventReminders() {
  const now = new Date();
  const results = { sent: 0, checked: 0 };

  const upcomingEvents = await prisma.event.findMany({
    where: {
      startTime: { gte: now },
      status: { in: ['PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING'] },
    },
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const event of upcomingEvents) {
    const hoursUntilStart = (event.startTime - now) / (1000 * 60 * 60);

    // eslint-disable-next-line no-restricted-syntax
    for (const window of REMINDER_WINDOWS) {
      if (hoursUntilStart > window.hoursBefore || hoursUntilStart <= window.bandLowerBound) {
        // eslint-disable-next-line no-continue
        continue; // outside this tier's band — either too early, or a closer tier already covers it
      }

      // eslint-disable-next-line no-await-in-loop
      const confirmedRegistrations = await prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: 'CONFIRMED' },
        include: { user: true },
      });

      // eslint-disable-next-line no-restricted-syntax
      for (const registration of confirmedRegistrations) {
        results.checked += 1;

        // eslint-disable-next-line no-await-in-loop
        const alreadySent = await prisma.notification.findFirst({
          where: { userId: registration.userId, eventId: event.id, type: window.type },
        });
        if (alreadySent) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        await prisma.notification.create({
          data: {
            userId: registration.userId,
            eventId: event.id,
            type: window.type,
            title: `Reminder: ${event.title}`,
            message: `${event.title} is ${window.label}.`,
          },
        });

        const mail = templates.eventReminder(registration.user.name, event.title, window.label);
        // eslint-disable-next-line no-await-in-loop
        await sendMail({ to: registration.user.email, ...mail }).catch(() => {});

        results.sent += 1;
      }
    }
  }

  return results;
}

// --- event cancellation notices ------------------------------------

async function notifyEventCancelled(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { notified: 0 };

  const affected = await prisma.eventRegistration.findMany({
    where: { eventId, status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] } },
    include: { user: true },
  });

  // eslint-disable-next-line no-restricted-syntax
  for (const registration of affected) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.notification
      .create({
        data: {
          userId: registration.userId,
          eventId,
          type: 'EVENT_CANCELLED',
          title: 'Event cancelled',
          message: `${event.title} has been cancelled. We're sorry for the inconvenience.`,
        },
      })
      .catch(() => {});

    // eslint-disable-next-line no-await-in-loop
    await sendMail({
      to: registration.user.email,
      subject: `Cancelled: ${event.title}`,
      html: `<p>Hi ${registration.user.name},</p><p><strong>${event.title}</strong> has been cancelled. We're sorry for the inconvenience — if you paid for this event, our team will follow up about a refund.</p>`,
    }).catch(() => {});
  }

  return { notified: affected.length };
}

// --- student-facing --------------------------------------------------

async function listForUser(userId, { unreadOnly = false } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readStatus: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function markRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readStatus: true },
  });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, readStatus: false },
    data: { readStatus: true },
  });
}

module.exports = {
  runEventReminders,
  notifyEventCancelled,
  listForUser,
  markRead,
  markAllRead,
};
