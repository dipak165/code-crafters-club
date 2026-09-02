// Permanent version of the payment signature tests from Phase 8.
// This is pure crypto with no DB dependency — the tests here are the
// actual security boundary that stops a forged "payment succeeded"
// callback from confirming a registration that was never paid for.
const crypto = require('crypto');
const { verifySignature } = require('../../utils/razorpay.util');

const REAL_SECRET = process.env.RAZORPAY_KEY_SECRET; // set in __tests__/setup/env.js

function signWith(secret, orderId, paymentId) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('razorpay.util — payment signature verification', () => {
  const orderId = 'order_ABC123';
  const paymentId = 'pay_XYZ789';

  test('a legitimate signature verifies correctly', () => {
    const signature = signWith(REAL_SECRET, orderId, paymentId);
    expect(verifySignature({ orderId, paymentId, signature })).toBe(true);
  });

  test('a forged/random signature is rejected', () => {
    expect(verifySignature({ orderId, paymentId, signature: 'deadbeef'.repeat(8) })).toBe(false);
  });

  test('a signature computed with the wrong secret is rejected', () => {
    const signature = signWith('attacker-does-not-know-the-real-secret', orderId, paymentId);
    expect(verifySignature({ orderId, paymentId, signature })).toBe(false);
  });

  test('a signature replayed against a different order is rejected', () => {
    const signature = signWith(REAL_SECRET, orderId, paymentId);
    expect(verifySignature({ orderId: 'order_DIFFERENT', paymentId, signature })).toBe(false);
  });

  test('an empty/malformed signature is rejected without throwing', () => {
    expect(() => verifySignature({ orderId, paymentId, signature: '' })).not.toThrow();
    expect(verifySignature({ orderId, paymentId, signature: '' })).toBe(false);
  });
});
