const db = { users: new Map(), clubYears: new Map(), members: new Map() };
let idCounter = 1;
const nextId = (prefix) => `${prefix}_${idCounter++}`;

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.email) return [...db.users.values()].find((u) => u.email === where.email) || null;
      return db.users.get(where.id) || null;
    }),
    update: jest.fn(async ({ where, data }) => {
      const user = db.users.get(where.id);
      Object.assign(user, data);
      return user;
    }),
  },
  clubYear: {
    upsert: jest.fn(async ({ where, create }) => {
      const existing = [...db.clubYears.values()].find((y) => y.year === where.year);
      if (existing) return existing;
      const record = { id: nextId('year'), ...create };
      db.clubYears.set(record.id, record);
      return record;
    }),
    findUnique: jest.fn(async ({ where }) => {
      if (where.year) return [...db.clubYears.values()].find((y) => y.year === where.year) || null;
      return db.clubYears.get(where.id) || null;
    }),
  },
  clubMember: {
    findUnique: jest.fn(async ({ where }) => {
      if (where.userId_clubYearId) {
        return (
          [...db.members.values()].find(
            (m) => m.userId === where.userId_clubYearId.userId && m.clubYearId === where.userId_clubYearId.clubYearId
          ) || null
        );
      }
      return db.members.get(where.id) || null;
    }),
    findMany: jest.fn(async ({ where }) => {
      let items = [...db.members.values()].filter((m) => m.clubYearId === where.clubYearId);
      if (where.leftAt === null) items = items.filter((m) => !m.leftAt);
      return items.map((m) => ({ ...m, user: db.users.get(m.userId) }));
    }),
    create: jest.fn(async ({ data }) => {
      const record = { id: nextId('member'), leftAt: null, ...data };
      db.members.set(record.id, record);
      return record;
    }),
    update: jest.fn(async ({ where, data }) => {
      const record = db.members.get(where.id);
      Object.assign(record, data);
      return record;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);

const memberService = require('../../services/member.service');

beforeEach(() => {
  db.users.clear();
  db.clubYears.clear();
  db.members.clear();
  idCounter = 1;

  db.users.set('u1', { id: 'u1', name: 'Alice', email: 'alice@x.com', phone: '9999999999', profileImageUrl: null });
  db.users.set('u2', { id: 'u2', name: 'Bob', email: 'bob@x.com', phone: '8888888888', profileImageUrl: null });
});

describe('member.service.addMember', () => {
  test('cannot add a member with no matching registered user account', async () => {
    await expect(
      memberService.addMember({ email: 'ghost@x.com', year: 2026, team: 'TECHNICAL_TEAM', position: 'Lead', skills: [] })
    ).rejects.toThrow(/registered student/);
  });

  test('duplicate membership for the same user+year is rejected', async () => {
    await memberService.addMember({ email: 'alice@x.com', year: 2026, team: 'TECHNICAL_TEAM', position: 'Lead', skills: [] });
    await expect(
      memberService.addMember({ email: 'alice@x.com', year: 2026, team: 'CONTENT_TEAM', position: 'Writer', skills: [] })
    ).rejects.toThrow(/already a club member/);
  });

  test('adding a member to a new year does not affect other years\' rosters', async () => {
    await memberService.addMember({ email: 'alice@x.com', year: 2026, team: 'TECHNICAL_TEAM', position: 'Lead', skills: [] });
    await memberService.addMember({ email: 'bob@x.com', year: 2025, team: 'PRESIDENT', position: 'President', skills: [] });

    const listing2025 = await memberService.getMembersByYear(2025);
    const listing2026 = await memberService.getMembersByYear(2026);
    expect(listing2025.members).toHaveLength(1);
    expect(listing2026.members).toHaveLength(1);
  });
});

describe('member.service — privacy gating (showContact)', () => {
  let alice;

  beforeEach(async () => {
    alice = await memberService.addMember({
      email: 'alice@x.com', year: 2026, team: 'TECHNICAL_TEAM', position: 'Technical Lead',
      skills: ['React'], showContact: false, cvUrl: 'local:alice-cv.pdf',
    });
  });

  test('contact info and CV link are hidden from the public listing when showContact is false', async () => {
    const listing = await memberService.getMembersByYear(2026);
    const alicePublic = listing.members.find((m) => m.name === 'Alice');
    expect(alicePublic.email).toBeUndefined();
    expect(alicePublic.phone).toBeUndefined();
    expect(alicePublic.cvUrl).toBeUndefined();
  });

  test('SECURITY: the CV route itself rejects a random student, not just hides the link', async () => {
    await expect(memberService.getCvPath(alice.id, { id: 'u2', role: 'STUDENT' })).rejects.toMatchObject({ statusCode: 403 });
  });

  test('the member\'s own account can still access their own CV', async () => {
    const path = await memberService.getCvPath(alice.id, { id: 'u1', role: 'STUDENT' });
    expect(path).toBe('local:alice-cv.pdf');
  });

  test('staff (TECHNICAL_TEAM) can access any member\'s CV', async () => {
    const path = await memberService.getCvPath(alice.id, { id: 'staff1', role: 'TECHNICAL_TEAM' });
    expect(path).toBe('local:alice-cv.pdf');
  });
});

describe('member.service.removeMemberFromYear', () => {
  test('soft-removes (sets leftAt) rather than deleting the underlying record', async () => {
    const alice = await memberService.addMember({ email: 'alice@x.com', year: 2026, team: 'TECHNICAL_TEAM', position: 'Lead', skills: [] });
    await memberService.removeMemberFromYear(alice.id);

    const listing = await memberService.getMembersByYear(2026);
    expect(listing.members).toHaveLength(0); // excluded from the public listing

    const rawRecord = db.members.get(alice.id);
    expect(rawRecord.leftAt).not.toBeNull(); // but the record itself still exists
  });
});
