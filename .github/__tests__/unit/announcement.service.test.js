const db = { announcements: new Map() };
let idCounter = 1;

const mockPrisma = {
  announcement: {
    findUnique: jest.fn(async ({ where }) => db.announcements.get(where.id) || null),
    create: jest.fn(async ({ data }) => {
      const record = { id: `a${idCounter++}`, ...data, createdAt: new Date() };
      db.announcements.set(record.id, record);
      return record;
    }),
    update: jest.fn(async ({ where, data }) => {
      const record = db.announcements.get(where.id);
      Object.assign(record, data);
      return record;
    }),
    findMany: jest.fn(async ({ where }) => {
      let items = [...db.announcements.values()];
      if (where?.status) items = items.filter((a) => a.status === where.status);
      return items;
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);

const announcementService = require('../../services/announcement.service');

beforeEach(() => {
  db.announcements.clear();
  idCounter = 1;
});

describe('announcement.service — publishedAt state transitions', () => {
  test('creating a DRAFT does not set publishedAt', async () => {
    const draft = await announcementService.create({ title: 'Draft one', content: 'x'.repeat(20), status: 'DRAFT' }, 'staff1');
    expect(draft.publishedAt).toBeNull();
  });

  test('creating with status=PUBLISHED sets publishedAt immediately', async () => {
    const published = await announcementService.create({ title: 'Live now', content: 'x'.repeat(20), status: 'PUBLISHED' }, 'staff1');
    expect(published.publishedAt).not.toBeNull();
  });

  test('publishing a draft for the first time sets publishedAt', async () => {
    const draft = await announcementService.create({ title: 'Draft', content: 'x'.repeat(20), status: 'DRAFT' }, 'staff1');
    const published = await announcementService.update(draft.id, { status: 'PUBLISHED' });
    expect(published.publishedAt).not.toBeNull();
  });

  test('CRITICAL: editing an already-published announcement does not reset publishedAt', async () => {
    const draft = await announcementService.create({ title: 'Draft', content: 'x'.repeat(20), status: 'DRAFT' }, 'staff1');
    const firstPublish = await announcementService.update(draft.id, { status: 'PUBLISHED' });
    const originalTimestamp = firstPublish.publishedAt.getTime();

    const editedLater = await announcementService.update(draft.id, { title: 'Fixed typo', status: 'PUBLISHED' });
    expect(editedLater.publishedAt.getTime()).toBe(originalTimestamp);
  });

  test('public listing excludes drafts', async () => {
    await announcementService.create({ title: 'Hidden draft', content: 'x'.repeat(20), status: 'DRAFT' }, 'staff1');
    await announcementService.create({ title: 'Visible', content: 'x'.repeat(20), status: 'PUBLISHED' }, 'staff1');

    const publicList = await announcementService.listPublished();
    const titles = publicList.map((a) => a.title);
    expect(titles).not.toContain('Hidden draft');
    expect(titles).toContain('Visible');
  });
});
