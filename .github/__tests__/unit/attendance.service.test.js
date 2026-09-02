const db = { events: new Map(), users: new Map(), registrations: new Map() };

const mockPrisma = {
  event: { findUnique: jest.fn(async ({ where }) => db.events.get(where.id) || null) },
  user: { findUnique: jest.fn(async ({ where }) => db.users.get(where.id) || null) },
  eventRegistration: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.qrToken) return [...db.registrations.values()].find((r) => r.qrToken === where.qrToken) || null;
      return db.registrations.get(where.id) || null;
    }),
    update: jest.fn(async ({ where, data }) => {
      const record = db.registrations.get(where.id);
      Object.assign(record, data);
      return record;
    }),
    count: jest.fn(async ({ where }) => {
      let items = [...db.registrations.values()].filter((r) => r.eventId === where.eventId);
      if (where.status) items = items.filter((r) => r.status === where.status);
      if (where.attendanceStatus) items = items.filter((r) => r.attendanceStatus === where.attendanceStatus);
      return items.length;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);
// awardForEventCheckIn is called internally via a lazy require of
// leaderboard.service, which itself hits the (mocked) db — mocking
// it directly here keeps this test focused on attendance, not points.
jest.mock('../../services/leaderboard.service', () => ({
  awardForEventCheckIn: jest.fn().mockResolvedValue({ awarded: true }),
}));

const attendanceService = require('../../services/attendance.service');

beforeEach(() => {
  db.events.clear();
  db.users.clear();
  db.registrations.clear();

  db.users.set('staff1', { id: 'staff1', name: 'Staff' });
  db.users.set('u1', { id: 'u1', name: 'Alice', email: 'alice@x.com' });
  db.users.set('u2', { id: 'u2', name: 'Bob', email: 'bob@x.com' });

  db.events.set('e1', { id: 'e1', certificateEnabled: true });
  db.events.set('e2', { id: 'e2', certificateEnabled: true });

  db.registrations.set('r1', {
    id: 'r1', userId: 'u1', eventId: 'e1', status: 'CONFIRMED',
    attendanceStatus: 'NOT_CHECKED_IN', qrToken: 'token-alice', registrationCode: 'CCC-E1-AAA',
  });
  db.registrations.set('r2', {
    id: 'r2', userId: 'u2', eventId: 'e1', status: 'CANCELLED',
    attendanceStatus: 'NOT_CHECKED_IN', qrToken: 'token-bob-cancelled', registrationCode: 'CCC-E1-BBB',
  });
});

describe('attendance.service.checkIn', () => {
  test('a valid check-in marks PRESENT and sets certificate eligibility', async () => {
    const result = await attendanceService.checkIn('staff1', 'e1', 'token-alice');
    expect(result.studentName).toBe('Alice');
    const r1 = db.registrations.get('r1');
    expect(r1.attendanceStatus).toBe('PRESENT');
    expect(r1.certificateStatus).toBe('ELIGIBLE');
    expect(r1.checkedInById).toBe('staff1');
  });

  test('checking in the same registration twice is rejected', async () => {
    await attendanceService.checkIn('staff1', 'e1', 'token-alice');
    await expect(attendanceService.checkIn('staff1', 'e1', 'token-alice')).rejects.toThrow(/already been checked in/);
  });

  test('a cancelled registration cannot be checked in', async () => {
    await expect(attendanceService.checkIn('staff1', 'e1', 'token-bob-cancelled')).rejects.toThrow(/cancelled/);
  });

  test('a QR token valid for one event is rejected at a different event', async () => {
    await expect(attendanceService.checkIn('staff1', 'e2', 'token-alice')).rejects.toThrow(/different event/);
  });

  test('an unrecognized QR token is rejected', async () => {
    await expect(attendanceService.checkIn('staff1', 'e1', 'totally-fake-token')).rejects.toThrow(/not recognized/);
  });
});
