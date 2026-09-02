// This tests the RETRY MECHANISM itself — that a P2034 (Postgres
// serialization conflict) causes a retry rather than an immediate
// failure, and that a non-conflict error is never retried. It does
// NOT test true concurrent-request behavior against a real database,
// since that requires actual concurrent Postgres transactions, which
// this sandbox's network restrictions make impossible (see README).
// This is an honest scope limitation, not a claim of full coverage.
let transactionAttempts = 0;
let failFirstNAttempts = 0;

const mockPrisma = {
  user: { findUnique: jest.fn(async () => ({ id: 'u1', name: 'Test', email: 'test@x.com' })) },
  event: {
    findUnique: jest.fn(async () => ({
      id: 'e1', slug: 'test-event', title: 'Test Event', status: 'REGISTRATION_OPEN',
      registrationDeadline: new Date(Date.now() + 86400000), maxParticipants: 5, registrationFee: 0,
    })),
  },
  eventRegistration: {
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    upsert: jest.fn(async ({ create }) => ({ id: 'reg1', ...create })),
  },
  eventWaitlist: { findUnique: jest.fn(async () => null) },
  notification: { create: jest.fn(async () => ({})) },
  $transaction: jest.fn(async (fn) => {
    transactionAttempts += 1;
    if (transactionAttempts <= failFirstNAttempts) {
      const err = new Error('Transaction conflict');
      err.code = 'P2034';
      throw err;
    }
    return fn(mockPrisma);
  }),
};

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../../utils/email.util');

const registrationService = require('../../services/registration.service');

beforeEach(() => {
  transactionAttempts = 0;
  failFirstNAttempts = 0;
});

describe('registration.service — serializable transaction retry', () => {
  test('a single serialization conflict is retried and the second attempt succeeds', async () => {
    failFirstNAttempts = 1; // fail once, succeed on retry
    const result = await registrationService.registerForEvent('u1', 'test-event');
    expect(result.status).toBe('CONFIRMED');
    expect(transactionAttempts).toBe(2);
  });

  test('repeated conflicts are retried up to the attempt limit, then the error surfaces', async () => {
    failFirstNAttempts = 10; // always conflicts — exceeds the retry limit
    await expect(registrationService.registerForEvent('u1', 'test-event')).rejects.toMatchObject({ code: 'P2034' });
    expect(transactionAttempts).toBe(3); // the configured max attempts, not retried forever
  });

  test('a non-conflict error is never retried — fails immediately on first attempt', async () => {
    mockPrisma.$transaction.mockImplementationOnce(async () => {
      transactionAttempts += 1;
      throw new Error('Some unrelated database error');
    });
    await expect(registrationService.registerForEvent('u1', 'test-event')).rejects.toThrow('Some unrelated database error');
    expect(transactionAttempts).toBe(1);
  });

  test('no conflict at all — succeeds on the very first attempt, no wasted retries', async () => {
    const result = await registrationService.registerForEvent('u1', 'test-event');
    expect(result.status).toBe('CONFIRMED');
    expect(transactionAttempts).toBe(1);
  });
});
