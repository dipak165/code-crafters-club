// Permanent version of the registration idempotency/waitlist tests
// verified ad-hoc during Phase 7 — now runs on every future change
// instead of once in a throwaway script.
const db = { registrations: new Map(), waitlist: new Map(), notifications: [] };
let idCounter = 1;
const nextId = () => `id_${idCounter++}`;

const mockPrisma = {
  user: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, name: 'Test User', email: 'test@x.com' })) },
  event: {
    findUnique: jest.fn(async ({ where }) => ({
      id: 'e1',
      slug: 'test-event',
      title: 'Test Event',
      status: 'REGISTRATION_OPEN',
      registrationDeadline: new Date(Date.now() + 86400000),
      maxParticipants: 1,
      registrationFee: 0,
    })),
  },
  eventRegistration: {
    findUnique: jest.fn(async ({ where }) => {
      const key = `${where.userId_eventId.userId}:${where.userId_eventId.eventId}`;
      return db.registrations.get(key) || null;
    }),
    count: jest.fn(async ({ where }) => {
      let items = [...db.registrations.values()].filter((r) => r.eventId === where.eventId);
      if (where.status) items = items.filter((r) => r.status === where.status);
      return items.length;
    }),
    upsert: jest.fn(async ({ where, update, create }) => {
      const key = `${where.userId_eventId.userId}:${where.userId_eventId.eventId}`;
      const existing = db.registrations.get(key);
      const record = existing ? { ...existing, ...update } : { id: nextId(), ...create };
      db.registrations.set(key, record);
      return record;
    }),
    update: jest.fn(async ({ where, data }) => {
      const record = [...db.registrations.values()].find((r) => r.id === where.id);
      Object.assign(record, data);
      return record;
    }),
  },
  eventWaitlist: {
    findUnique: jest.fn(async ({ where }) => {
      const key = `${where.userId_eventId.userId}:${where.userId_eventId.eventId}`;
      return db.waitlist.get(key) || null;
    }),
    count: jest.fn(async ({ where }) => [...db.waitlist.values()].filter((w) => w.eventId === where.eventId).length),
    create: jest.fn(async ({ data }) => {
      const record = { id: nextId(), promotedAt: null, ...data };
      db.waitlist.set(`${data.userId}:${data.eventId}`, record);
      return record;
    }),
    delete: jest.fn(async ({ where }) => {
      const entry = [...db.waitlist.values()].find((w) => w.id === where.id);
      db.waitlist.delete(`${entry.userId}:${entry.eventId}`);
      return entry;
    }),
    findFirst: jest.fn(async ({ where }) =>
      [...db.waitlist.values()]
        .filter((w) => w.eventId === where.eventId && w.promotedAt === null)
        .sort((a, b) => a.position - b.position)[0] || null
    ),
    update: jest.fn(async ({ where, data }) => {
      const record = [...db.waitlist.values()].find((w) => w.id === where.id);
      Object.assign(record, data);
      return record;
    }),
  },
  notification: { create: jest.fn(async ({ data }) => data) },
};

// The service now wraps capacity-sensitive writes in a Serializable
// transaction (Phase 19 hardening fix for a TOCTOU race). This fake
// doesn't simulate real Postgres transaction/conflict semantics —
// that requires actual concurrent DB access, which this sandbox can't
// provide — but it does let every existing business-logic test keep
// running unmodified, since `tx` here is just `mockPrisma` itself.
mockPrisma.$transaction = jest.fn(async (fn) => fn(mockPrisma));

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../../utils/email.util');

const registrationService = require('../../services/registration.service');

beforeEach(() => {
  db.registrations.clear();
  db.waitlist.clear();
  db.notifications = [];
  idCounter = 1;
});

describe('registration.service', () => {
  test('first registration confirms', async () => {
    const result = await registrationService.registerForEvent('u1', 'test-event');
    expect(result.status).toBe('CONFIRMED');
  });

  test('duplicate registration by the same user is rejected', async () => {
    await registrationService.registerForEvent('u1', 'test-event');
    await expect(registrationService.registerForEvent('u1', 'test-event')).rejects.toThrow(/already registered/);
  });

  test('registrant hitting event capacity is waitlisted, not rejected', async () => {
    await registrationService.registerForEvent('u1', 'test-event'); // fills the 1-seat event
    const result = await registrationService.registerForEvent('u2', 'test-event');
    expect(result.status).toBe('WAITLISTED');
    expect(result.position).toBe(1);
  });

  test('waitlist positions increment for subsequent registrants', async () => {
    await registrationService.registerForEvent('u1', 'test-event');
    await registrationService.registerForEvent('u2', 'test-event');
    const result = await registrationService.registerForEvent('u3', 'test-event');
    expect(result.position).toBe(2);
  });

  test('cancelling a confirmed registration promotes the earliest waitlisted student', async () => {
    await registrationService.registerForEvent('u1', 'test-event');
    await registrationService.registerForEvent('u2', 'test-event'); // waitlisted #1
    await registrationService.registerForEvent('u3', 'test-event'); // waitlisted #2

    await registrationService.cancelRegistration('u1', 'test-event');

    const u2Reg = await mockPrisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId: 'u2', eventId: 'e1' } },
    });
    expect(u2Reg.status).toBe('CONFIRMED');

    const u2Waitlist = db.waitlist.get('u2:e1');
    expect(u2Waitlist.promotedAt).not.toBeNull();

    const u3Waitlist = db.waitlist.get('u3:e1');
    expect(u3Waitlist.promotedAt).toBeNull();
  });
});
