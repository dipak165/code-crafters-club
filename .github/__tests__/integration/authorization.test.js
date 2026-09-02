// Integration-level: unlike the unit tests, this exercises the REAL
// Express app, REAL auth middleware, and REAL permission-checking
// middleware — only the database is mocked. This is what actually
// proves "a student cannot create an event" as an end-to-end HTTP
// behavior, not just as isolated service logic.
const request = require('supertest');
const { signAccessToken } = require('../../utils/jwt.util');

const STUDENT = { id: 'student1', role: 'STUDENT', emailVerified: true, isActive: true };
const TECH_TEAM = { id: 'tech1', role: 'TECHNICAL_TEAM', emailVerified: true, isActive: true };
const PRESIDENT = { id: 'pres1', role: 'PRESIDENT', emailVerified: true, isActive: true };

const usersById = { [STUDENT.id]: STUDENT, [TECH_TEAM.id]: TECH_TEAM, [PRESIDENT.id]: PRESIDENT };

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }) => usersById[where.id] || null),
    count: jest.fn(async () => 0),
  },
  event: {
    findUnique: jest.fn(async () => null), // slug is "unique" (no collision) for create
    create: jest.fn(async ({ data }) => ({ id: 'new-event-id', ...data })),
    count: jest.fn(async () => 0),
  },
  eventRegistration: { count: jest.fn(async () => 0) },
  payment: { aggregate: jest.fn(async () => ({ _sum: { amount: null } })) },
  certificate: { count: jest.fn(async () => 0) },
  clubMember: { count: jest.fn(async () => 0) },
  clubYear: { findMany: jest.fn(async () => []) },
};

jest.mock('../../config/db', () => mockPrisma);

const app = require('../../app');

function bearerFor(user) {
  return `Bearer ${signAccessToken(user)}`;
}

const validEventPayload = {
  title: 'Test Event',
  description: 'A perfectly valid test event description.',
  category: 'WORKSHOP',
  eventDate: '2027-01-01T00:00:00.000Z',
  startTime: '2027-01-01T10:00:00.000Z',
  endTime: '2027-01-01T12:00:00.000Z',
  registrationStart: '2026-12-01T00:00:00.000Z',
  registrationDeadline: '2026-12-31T00:00:00.000Z',
  mode: 'OFFLINE',
  maxParticipants: 50,
};

describe('RBAC — event creation (spec 65: "Student cannot create event")', () => {
  test('a STUDENT is rejected with 403 when trying to create an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', bearerFor(STUDENT))
      .send(validEventPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('TECHNICAL_TEAM is NOT blocked by the permission check (passes through to the service)', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', bearerFor(TECH_TEAM))
      .send(validEventPayload);

    // The point of this test is the authorization boundary, not the
    // full create flow — so we only assert it's not a 403. Any other
    // status means the request got PAST the permission check, which
    // is what "technical team can create events" actually means here.
    expect(res.status).not.toBe(403);
  });

  test('an unauthenticated request is rejected with 401, never even reaching the permission check', async () => {
    const res = await request(app).post('/api/events').send(validEventPayload);
    expect(res.status).toBe(401);
  });
});

describe('RBAC — analytics access (VIEW_ANALYTICS)', () => {
  test('a STUDENT cannot view analytics', async () => {
    const res = await request(app).get('/api/analytics/overview').set('Authorization', bearerFor(STUDENT));
    expect(res.status).toBe(403);
  });

  test('PRESIDENT (who holds VIEW_ANALYTICS but not CREATE_EVENT) is not blocked from analytics', async () => {
    const res = await request(app).get('/api/analytics/overview').set('Authorization', bearerFor(PRESIDENT));
    expect(res.status).toBe(200);
  });

  test('PRESIDENT is still blocked from creating events — VIEW_ANALYTICS does not imply CREATE_EVENT', async () => {
    const res = await request(app).post('/api/events').set('Authorization', bearerFor(PRESIDENT)).send(validEventPayload);
    expect(res.status).toBe(403);
  });
});

describe('Authentication — no bypassing via malformed tokens', () => {
  test('a garbage/invalid Authorization header is rejected with 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  test('no Authorization header at all is rejected with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
