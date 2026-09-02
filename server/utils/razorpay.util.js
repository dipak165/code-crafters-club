const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const AppError = require('./AppError');

let client = null;

function getClient() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new AppError('Payment gateway is not configured. Please contact the club admin.', 503);
  }
  if (!client) {
    client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  return client;
}

async function createOrder({ amountInPaise, receipt, notes }) {
  const razorpay = getClient();
  return razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes,
  });
}

// The ONLY trustworthy way to know a payment succeeded: recompute the
// HMAC-SHA256 signature server-side from the order + payment IDs using
// our secret key, and compare it to what the client sent. A frontend
// "payment successful" flag can be forged trivially, so it is never
// used to confirm a registration — only this check is.
function verifySignature({ orderId, paymentId, signature }) {
  if (!env.razorpay.keySecret) {
    throw new AppError('Payment gateway is not configured.', 503);
  }
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature || '', 'utf8');

  // timingSafeEqual requires equal-length buffers, and throws otherwise —
  // guard that first so a malformed signature can't crash the request.
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

module.exports = { createOrder, verifySignature };
