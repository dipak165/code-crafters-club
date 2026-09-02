const db = { applications: new Map() };
let idCounter = 1;

const mockPrisma = {
  recruitmentApplication: {
    create: jest.fn(async ({ data }) => {
      const record = { id: `app${idCounter++}`, status: 'APPLIED', createdAt: new Date(), updatedAt: new Date(), ...data };
      db.applications.set(record.id, record);
      return record;
    }),
    findUnique: jest.fn(async ({ where }) => db.applications.get(where.id) || null),
    update: jest.fn(async ({ where, data }) => {
      const record = db.applications.get(where.id);
      Object.assign(record, data);
      return record;
    }),
    findMany: jest.fn(async ({ where }) => {
      let items = [...db.applications.values()];
      if (where.status) items = items.filter((a) => a.status === where.status);
      return items;
    }),
    count: jest.fn(async ({ where }) => {
      let items = [...db.applications.values()];
      if (where.status) items = items.filter((a) => a.status === where.status);
      return items.length;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../../utils/email.util');

const recruitmentService = require('../../services/recruitment.service');

beforeEach(() => {
  db.applications.clear();
  idCounter = 1;
});

const validInput = {
  name: 'Alice', email: 'alice@x.com', phone: '9999999999', graduationYear: 2027,
  skills: ['React'], teamPreference: 'TECHNICAL_TEAM', motivation: 'x'.repeat(25),
};

describe('recruitment.service.apply', () => {
  test('captures userId when the applicant is logged in', async () => {
    const app = await recruitmentService.apply({ ...validInput, resumeUrl: 'local:alice-resume.pdf' }, 'u1');
    expect(app.userId).toBe('u1');
  });

  test('accepts anonymous (not logged in) applications', async () => {
    const app = await recruitmentService.apply({ ...validInput, email: 'bob@x.com' }, undefined);
    expect(app.userId).toBeNull();
  });
});

describe('recruitment.service.getResumePath — access control', () => {
  let application;

  beforeEach(async () => {
    application = await recruitmentService.apply({ ...validInput, resumeUrl: 'local:alice-resume.pdf' }, 'u1');
  });

  test('the applicant themself can access their own resume', async () => {
    const path = await recruitmentService.getResumePath(application.id, { id: 'u1', role: 'STUDENT' });
    expect(path).toBe('local:alice-resume.pdf');
  });

  test('staff (TECHNICAL_TEAM) can access any resume', async () => {
    const path = await recruitmentService.getResumePath(application.id, { id: 'staff1', role: 'TECHNICAL_TEAM' });
    expect(path).toBe('local:alice-resume.pdf');
  });

  test('SECURITY: a random logged-in student cannot access another applicant\'s resume', async () => {
    await expect(
      recruitmentService.getResumePath(application.id, { id: 'u2', role: 'STUDENT' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('recruitment.service — status and listing', () => {
  test('status update persists', async () => {
    const application = await recruitmentService.apply(validInput, 'u1');
    const updated = await recruitmentService.updateStatus(application.id, 'SHORTLISTED');
    expect(updated.status).toBe('SHORTLISTED');
  });

  test('staff listing filters by status correctly', async () => {
    const app1 = await recruitmentService.apply(validInput, 'u1');
    await recruitmentService.apply({ ...validInput, email: 'bob@x.com' }, 'u2');
    await recruitmentService.updateStatus(app1.id, 'SHORTLISTED');

    const shortlisted = await recruitmentService.listAll({ status: 'SHORTLISTED' });
    expect(shortlisted.data).toHaveLength(1);
    expect(shortlisted.data[0].id).toBe(app1.id);
  });
});
