const db = { events: new Map(), users: new Map(), registrations: new Map(), certificates: new Map() };

const mockPrisma = {
  event: { findUnique: jest.fn(async ({ where }) => db.events.get(where.id) || null) },
  eventRegistration: {
    findMany: jest.fn(async ({ where }) => {
      let items = [...db.registrations.values()].filter((r) => r.eventId === where.eventId);
      if (where.certificateStatus) items = items.filter((r) => r.certificateStatus === where.certificateStatus);
      return items.map((r) => ({
        ...r,
        user: db.users.get(r.userId),
        certificate: [...db.certificates.values()].find((c) => c.registrationId === r.id) || null,
      }));
    }),
    update: jest.fn(async ({ where, data }) => {
      const record = db.registrations.get(where.id);
      Object.assign(record, data);
      return record;
    }),
  },
  certificate: {
    create: jest.fn(async ({ data }) => {
      const record = { id: `cert_${db.certificates.size + 1}`, ...data };
      db.certificates.set(record.id, record);
      return record;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../../utils/email.util');
jest.mock('../../utils/certificatePdf.util', () => ({
  renderCertificatePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake-for-test')),
}));
jest.mock('../../services/leaderboard.service', () => ({
  awardForCertificate: jest.fn().mockResolvedValue({ awarded: true }),
}));

// certificate.service writes real PDF bytes to disk via fs — mock
// that out too so this stays a fast, disk-free unit test.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => Buffer.from('%PDF-fake')),
}));

const certificateService = require('../../services/certificate.service');

beforeEach(() => {
  db.events.clear();
  db.users.clear();
  db.registrations.clear();
  db.certificates.clear();

  db.users.set('u1', { id: 'u1', name: 'Alice', email: 'alice@x.com' });
  db.users.set('u2', { id: 'u2', name: 'Bob', email: 'bob@x.com' });
  db.users.set('u3', { id: 'u3', name: 'Cara', email: 'cara@x.com' });

  db.events.set('e1', { id: 'e1', title: 'Test Workshop', eventDate: new Date(), certificateEnabled: true });

  // u1: attended (ELIGIBLE), no certificate yet -> should be issued.
  db.registrations.set('r1', { id: 'r1', userId: 'u1', eventId: 'e1', certificateStatus: 'ELIGIBLE' });
  // u2: never checked in -> should be excluded entirely (query-level, not just skipped).
  db.registrations.set('r2', { id: 'r2', userId: 'u2', eventId: 'e1', certificateStatus: 'NOT_ELIGIBLE' });
  // u3: simulates a retry-after-partial-failure — cert already exists
  // but status is still ELIGIBLE (as if a prior run's status-update step failed).
  db.registrations.set('r3', { id: 'r3', userId: 'u3', eventId: 'e1', certificateStatus: 'ELIGIBLE' });
  db.certificates.set('existing', { id: 'existing', registrationId: 'r3', userId: 'u3', certificateCode: 'CCC-2026-EXISTING' });
});

describe('certificate.service.generateForEvent', () => {
  test('only the eligible, un-issued registrant gets a certificate', async () => {
    const result = await certificateService.generateForEvent('e1');
    expect(result.issued).toBe(1);
  });

  test('a registrant with an existing certificate is skipped, not duplicated', async () => {
    const result = await certificateService.generateForEvent('e1');
    expect(result.skipped).toBe(1);
  });

  test('registration certificateStatus flips to ISSUED after generation', async () => {
    await certificateService.generateForEvent('e1');
    expect(db.registrations.get('r1').certificateStatus).toBe('ISSUED');
  });

  test('certificate code follows the CCC-YYYY-XXXXXX format', async () => {
    await certificateService.generateForEvent('e1');
    const newCert = [...db.certificates.values()].find((c) => c.userId === 'u1');
    expect(newCert.certificateCode).toMatch(/^CCC-\d{4}-[0-9A-F]+$/);
  });
});
