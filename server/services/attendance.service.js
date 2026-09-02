const prisma = require('../config/db');
const AppError = require('../utils/AppError');

// Staff scans (or types) the QR token printed on a student's digital
// pass. This is intentionally decoupled from *how* the token gets
// here — camera scanning, manual entry, whatever — the validation
// rules are the same either way.
async function checkIn(staffId, eventId, qrToken) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError('Event not found.', 404);

  const registration = await prisma.eventRegistration.findUnique({ where: { qrToken } });

  if (!registration) {
    throw new AppError('This QR code is not recognized.', 404);
  }
  if (registration.eventId !== eventId) {
    throw new AppError('This QR code belongs to a different event.', 400);
  }
  if (registration.status === 'CANCELLED') {
    throw new AppError('This registration was cancelled.', 400);
  }
  if (registration.status === 'PENDING_PAYMENT') {
    throw new AppError('This registration has an incomplete payment.', 400);
  }
  if (registration.attendanceStatus === 'PRESENT') {
    throw new AppError('This student has already been checked in.', 409);
  }

  const updated = await prisma.eventRegistration.update({
    where: { id: registration.id },
    data: {
      attendanceStatus: 'PRESENT',
      checkedInAt: new Date(),
      checkedInById: staffId,
      // Attendance is what actually unlocks certificate eligibility —
      // this is the single place that flag gets set to ELIGIBLE.
      certificateStatus: event.certificateEnabled ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
    },
  });

  const student = await prisma.user.findUnique({ where: { id: updated.userId } });

  // Lazy require avoids a circular dependency at module-load time —
  // leaderboard.service.js has no reason to know about attendance,
  // and the reverse coupling isn't worth a top-level import for one call.
  require('./leaderboard.service')
    .awardForEventCheckIn(updated.userId, eventId, event.category)
    .catch(() => {}); // never let a leaderboard hiccup fail a real check-in

  return {
    registrationCode: updated.registrationCode,
    studentName: student.name,
    studentEmail: student.email,
    checkedInAt: updated.checkedInAt,
  };
}

async function getAttendanceSummary(eventId) {
  const [confirmed, present] = await Promise.all([
    prisma.eventRegistration.count({ where: { eventId, status: 'CONFIRMED' } }),
    prisma.eventRegistration.count({ where: { eventId, attendanceStatus: 'PRESENT' } }),
  ]);
  return { confirmed, present, absent: confirmed - present };
}

module.exports = { checkIn, getAttendanceSummary };
