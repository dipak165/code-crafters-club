const db = { users: new Map() };

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }) => db.users.get(where.id) || null),
    update: jest.fn(async ({ where, data }) => {
      const user = db.users.get(where.id);
      Object.assign(user, data);
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    }),
  },
};

jest.mock('../../config/db', () => mockPrisma);

const userService = require('../../services/user.service');

beforeEach(() => {
  db.users.clear();
  db.users.set('super1', { id: 'super1', name: 'Super Admin', email: 'super@x.com', role: 'SUPER_ADMIN' });
  db.users.set('student1', { id: 'student1', name: 'A Student', email: 'student@x.com', role: 'STUDENT' });
});

describe('user.service.updateRole', () => {
  test('a Super Admin can promote a student to a staff role', async () => {
    const updated = await userService.updateRole('student1', 'TECHNICAL_TEAM', 'super1');
    expect(updated.role).toBe('TECHNICAL_TEAM');
  });

  test('BUSINESS RULE: a user cannot change their own role, even a Super Admin', async () => {
    await expect(userService.updateRole('super1', 'STUDENT', 'super1')).rejects.toMatchObject({ statusCode: 403 });
  });

  test('updating a nonexistent user is rejected with 404', async () => {
    await expect(userService.updateRole('ghost-id', 'TECHNICAL_TEAM', 'super1')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('the target user record is actually updated in the database', async () => {
    await userService.updateRole('student1', 'CONTENT_TEAM', 'super1');
    expect(db.users.get('student1').role).toBe('CONTENT_TEAM');
  });
});
