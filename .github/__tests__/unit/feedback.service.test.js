const db = { events: new Map(), registrations: new Map(), feedback: new Map() };

const mockPrisma = {
  event: { findUnique: jest.fn(async ({ where }) => db.events.get(where.slug || where.id) || null) },
  eventRegistration: {
    findUnique: jest.fn(async ({ where }) => {
      const key = `${where.userId_eventId.userId}:${where.userId_eventId.eventId}`;
      return db.registrations.get(key) || null;
    }),
  },
  eventFeedback: {
    findUnique: jest.fn(async ({ where }) => {
      const key = `${where.eventId_userId.eventId}:${where.eventId_userId.userId}`;
      return db.feedback.get(key) || null;
    }),
    create: jest.fn(async ({ data }) => {
      const record = { id: `f${db.feedback.size + 1}`, createdAt: new Date(), ...data };
      db.feedback.set(`${data.eventId}:${data.userId}`, record);
      return record;
    }),
    aggregate: jest.fn(async ({ where }) => {
      const items = [...db.feedback.values()].filter((f) => f.eventId === where.eventId);
      const avg = (key) => {
        const vals = items.map((i) => i[key]).filter((v) => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      return {
        _avg: { rating: avg('rating'), speakerRating: avg('speakerRating'), organizationRating: avg('organizationRating') },
        _count: { _all: items.length },
      };
    }),
    findMany: jest.fn(async ({ where }) =>
      [...db.feedback.values()].filter((f) => f.eventId === where.eventId).map((f) => ({ ...f, user: { name: 'Test User' } }))
    ),
  },
};

jest.mock('../../config/db', () => mockPrisma);

const feedbackService = require('../../services/feedback.service');

beforeEach(() => {
  db.events.clear();
  db.registrations.clear();
  db.feedback.clear();

  const event = { id: 'e1', slug: 'test-event', title: 'Test Event' };
  db.events.set('e1', event);
  db.events.set('test-event', event);
});

describe('feedback.service.submit — attendance gating', () => {
  test('a student who never registered cannot leave feedback', async () => {
    await expect(feedbackService.submit('u_norego', 'test-event', { rating: 5 })).rejects.toThrow(/attended/);
  });

  test('a student who registered but was never checked in cannot leave feedback', async () => {
    db.registrations.set('u_noshow:e1', { userId: 'u_noshow', eventId: 'e1', status: 'CONFIRMED', attendanceStatus: 'NOT_CHECKED_IN' });
    await expect(feedbackService.submit('u_noshow', 'test-event', { rating: 5 })).rejects.toThrow(/attended/);
  });

  test('a checked-in (attended) student can submit feedback', async () => {
    db.registrations.set('u1:e1', { userId: 'u1', eventId: 'e1', status: 'CONFIRMED', attendanceStatus: 'PRESENT' });
    const fb = await feedbackService.submit('u1', 'test-event', { rating: 4 });
    expect(fb.rating).toBe(4);
  });

  test('a second submission from the same attended student is rejected', async () => {
    db.registrations.set('u1:e1', { userId: 'u1', eventId: 'e1', status: 'CONFIRMED', attendanceStatus: 'PRESENT' });
    await feedbackService.submit('u1', 'test-event', { rating: 4 });
    await expect(feedbackService.submit('u1', 'test-event', { rating: 1 })).rejects.toThrow(/already submitted/);
  });
});

describe('feedback.service — public vs staff visibility', () => {
  beforeEach(async () => {
    db.registrations.set('u1:e1', { userId: 'u1', eventId: 'e1', status: 'CONFIRMED', attendanceStatus: 'PRESENT' });
    db.registrations.set('u2:e1', { userId: 'u2', eventId: 'e1', status: 'CONFIRMED', attendanceStatus: 'PRESENT' });
    await feedbackService.submit('u1', 'test-event', { rating: 4, comments: 'Great session!' });
    await feedbackService.submit('u2', 'test-event', { rating: 2, comments: 'Could be better.' });
  });

  test('public summary aggregates ratings correctly', async () => {
    const summary = await feedbackService.getPublicSummary('e1');
    expect(summary.count).toBe(2);
    expect(summary.avgRating).toBe(3);
  });

  test('public summary never includes individual comments', async () => {
    const summary = await feedbackService.getPublicSummary('e1');
    expect(summary.comments).toBeUndefined();
  });

  test('staff detail view includes individual comments', async () => {
    const staffView = await feedbackService.getStaffDetail('e1');
    expect(staffView.entries).toHaveLength(2);
    expect(staffView.entries.some((e) => e.comments === 'Great session!')).toBe(true);
  });
});
