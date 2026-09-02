const db = { rules: new Map(), ledger: [], users: new Map() };
let idCounter = 1;

const RULES = [
  ['EVENT_PARTICIPATION', 10], ['WORKSHOP', 5], ['HACKATHON', 20],
  ['WIN', 50], ['VOLUNTEER', 15], ['CERTIFICATE', 10],
];

const mockPrisma = {
  pointRule: {
    findUnique: jest.fn(async ({ where }) => db.rules.get(where.action) || null),
    findMany: jest.fn(async () => [...db.rules.values()]),
    update: jest.fn(async ({ where, data }) => {
      const rule = db.rules.get(where.action);
      Object.assign(rule, data);
      return rule;
    }),
  },
  pointLedger: {
    findFirst: jest.fn(async ({ where }) =>
      db.ledger.find((l) => l.userId === where.userId && l.eventId === where.eventId && l.action === where.action) || null
    ),
    create: jest.fn(async ({ data }) => {
      const record = { id: `pl${idCounter++}`, createdAt: new Date(), ...data };
      db.ledger.push(record);
      return record;
    }),
    aggregate: jest.fn(async ({ where }) => {
      const items = db.ledger.filter((l) => l.userId === where.userId);
      return { _sum: { points: items.reduce((s, i) => s + i.points, 0) || null } };
    }),
    groupBy: jest.fn(async ({ orderBy, take }) => {
      const totals = new Map();
      db.ledger.forEach((l) => totals.set(l.userId, (totals.get(l.userId) || 0) + l.points));
      let result = [...totals.entries()].map(([userId, points]) => ({ userId, _sum: { points } }));
      if (orderBy?._sum?.points === 'desc') result.sort((a, b) => b._sum.points - a._sum.points);
      if (take) result = result.slice(0, take);
      return result;
    }),
  },
  user: { findMany: jest.fn(async ({ where }) => [...db.users.values()].filter((u) => where.id.in.includes(u.id))) },
};

jest.mock('../../config/db', () => mockPrisma);

const leaderboardService = require('../../services/leaderboard.service');

beforeEach(() => {
  db.rules.clear();
  db.ledger.length = 0;
  db.users.clear();
  idCounter = 1;

  RULES.forEach(([action, points]) => db.rules.set(action, { action, points }));
  db.users.set('u1', { id: 'u1', name: 'Alice', profileImageUrl: null, graduationYear: 2027 });
  db.users.set('u2', { id: 'u2', name: 'Bob', profileImageUrl: null, graduationYear: 2027 });
});

describe('leaderboard.service — point values by category', () => {
  test('hackathon check-in awards 20 points, not the generic 10', async () => {
    const r = await leaderboardService.awardForEventCheckIn('u1', 'event-hackathon', 'HACKATHON');
    expect(r.awarded).toBe(true);
    expect(r.entry.points).toBe(20);
  });

  test('workshop check-in awards 5 points', async () => {
    const r = await leaderboardService.awardForEventCheckIn('u1', 'event-workshop', 'WORKSHOP');
    expect(r.entry.points).toBe(5);
  });

  test('a generic event category falls back to EVENT_PARTICIPATION (10 points)', async () => {
    const r = await leaderboardService.awardForEventCheckIn('u1', 'event-seminar', 'SEMINAR');
    expect(r.entry.points).toBe(10);
  });
});

describe('leaderboard.service — idempotency (the core guarantee)', () => {
  test('awarding twice for the same user+event+action does not duplicate', async () => {
    await leaderboardService.awardForEventCheckIn('u1', 'event-hackathon', 'HACKATHON');
    const before = db.ledger.length;
    const second = await leaderboardService.awardForEventCheckIn('u1', 'event-hackathon', 'HACKATHON');
    expect(second.awarded).toBe(false);
    expect(db.ledger.length).toBe(before);
  });

  test('a different action for the SAME event still awards (dedup key is event+action, not just event)', async () => {
    await leaderboardService.awardForEventCheckIn('u1', 'event-hackathon', 'HACKATHON');
    const certResult = await leaderboardService.awardForCertificate('u1', 'event-hackathon');
    expect(certResult.awarded).toBe(true);
  });

  test('manual awards with no eventId are allowed to recur', async () => {
    await leaderboardService.awardPoints({ userId: 'u2', action: 'VOLUNTEER' });
    const second = await leaderboardService.awardPoints({ userId: 'u2', action: 'VOLUNTEER' });
    expect(second.awarded).toBe(true);
  });
});

describe('leaderboard.service — ranking', () => {
  beforeEach(async () => {
    await leaderboardService.awardForEventCheckIn('u1', 'event-hackathon', 'HACKATHON'); // 20 pts
    await leaderboardService.awardForEventCheckIn('u2', 'event-workshop', 'WORKSHOP'); // 5 pts
  });

  test('top contributors ranks by total points, highest first', async () => {
    const top = await leaderboardService.getTopContributors(10);
    expect(top[0].userId).toBe('u1');
    expect(top[0].rank).toBe(1);
  });

  test('personal rank lookup agrees with the public leaderboard ordering', async () => {
    const standing = await leaderboardService.getMyStanding('u1');
    expect(standing.rank).toBe(1);
  });
});
