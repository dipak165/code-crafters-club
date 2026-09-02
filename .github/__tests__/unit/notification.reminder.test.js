const db = { events: new Map(), registrations: new Map(), notifications: [], users: new Map() };

const mockPrisma = {
  event: {
    findMany: jest.fn(async ({ where }) =>
      [...db.events.values()].filter((e) => e.startTime >= where.startTime.gte && where.status.in.includes(e.status))
    ),
    findUnique: jest.fn(async ({ where }) => db.events.get(where.id) || null),
  },
  eventRegistration: {
    findMany: jest.fn(async ({ where }) => {
      let items = [...db.registrations.values()].filter((r) => r.eventId === where.eventId);
      if (where.status?.in) items = items.filter((r) => where.status.in.includes(r.status));
      else if (where.status) items = items.filter((r) => r.status === where.status);
      return items.map((r) => ({ ...r, user: db.users.get(r.userId) }));
    }),
  },
  notification: {
    findFirst: jest.fn(async ({ where }) =>
      db.notifications.find((n) => n.userId === where.userId && n.eventId === where.eventId && n.type === where.type) || null
    ),
    create: jest.fn(async ({ data }) => {
      const record = { id: `n${db.notifications.length + 1}`, readStatus: false, createdAt: new Date(), ...data };
      db.notifications.push(record);
      return record;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../../utils/email.util');

const notificationService = require('../../services/notification.service');

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

beforeEach(() => {
  db.events.clear();
  db.registrations.clear();
  db.notifications = [];
  db.users.clear();

  db.users.set('u1', { id: 'u1', name: 'Alice', email: 'alice@x.com' });
  db.users.set('u2', { id: 'u2', name: 'Bob', email: 'bob@x.com' });
});

describe('notification.service.runEventReminders — correct tier selection', () => {
  test('an event 20 hours out triggers only the 1-day reminder, not the 7-day one', async () => {
    db.events.set('eventA', { id: 'eventA', title: 'Event A', startTime: hoursFromNow(20), status: 'REGISTRATION_OPEN' });
    db.registrations.set('r1', { id: 'r1', userId: 'u1', eventId: 'eventA', status: 'CONFIRMED' });

    await notificationService.runEventReminders();

    const notifs = db.notifications.filter((n) => n.eventId === 'eventA');
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe('REMINDER_1D');
  });

  test('an event more than 7 days out triggers no reminders yet', async () => {
    db.events.set('eventB', { id: 'eventB', title: 'Event B', startTime: hoursFromNow(200), status: 'REGISTRATION_OPEN' });
    db.registrations.set('r2', { id: 'r2', userId: 'u1', eventId: 'eventB', status: 'CONFIRMED' });

    await notificationService.runEventReminders();

    expect(db.notifications.filter((n) => n.eventId === 'eventB')).toHaveLength(0);
  });
});

describe('notification.service.runEventReminders — idempotency (the core guarantee)', () => {
  beforeEach(() => {
    db.events.set('eventA', { id: 'eventA', title: 'Event A', startTime: hoursFromNow(20), status: 'REGISTRATION_OPEN' });
    db.registrations.set('r1', { id: 'r1', userId: 'u1', eventId: 'eventA', status: 'CONFIRMED' });
    db.registrations.set('r2', { id: 'r2', userId: 'u2', eventId: 'eventA', status: 'CONFIRMED' });
  });

  test('running the sweep twice in a row produces zero duplicate notifications', async () => {
    await notificationService.runEventReminders();
    const countAfterFirst = db.notifications.length;

    const secondResult = await notificationService.runEventReminders();

    expect(db.notifications.length).toBe(countAfterFirst);
    expect(secondResult.sent).toBe(0);
  });

  test('as an event gets closer, additional tiers fire without disturbing earlier ones', async () => {
    await notificationService.runEventReminders(); // sends 1-day reminders

    db.events.get('eventA').startTime = hoursFromNow(0.5); // now 30 min out
    await notificationService.runEventReminders();

    const notifs = db.notifications.filter((n) => n.eventId === 'eventA');
    expect(notifs.filter((n) => n.type === 'REMINDER_1D')).toHaveLength(2); // untouched
    expect(notifs.filter((n) => n.type === 'REMINDER_1H')).toHaveLength(2); // newly added
  });
});

describe('notification.service.notifyEventCancelled', () => {
  test('only notifies active (CONFIRMED/PENDING_PAYMENT) registrants, not already-cancelled ones', async () => {
    db.events.set('eventC', { id: 'eventC', title: 'Event C' });
    db.registrations.set('r10', { id: 'r10', userId: 'u1', eventId: 'eventC', status: 'CONFIRMED' });
    db.registrations.set('r11', { id: 'r11', userId: 'u2', eventId: 'eventC', status: 'CANCELLED' });

    const result = await notificationService.notifyEventCancelled('eventC');
    expect(result.notified).toBe(1);
  });
});
