const crypto = require('crypto');
const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const razorpayUtil = require('../utils/razorpay.util');
const { sendMail, templates } = require('../utils/email.util');
const env = require('../config/env');

function generateRegistrationCode(eventSlug) {
  const shortCode = eventSlug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CCC-${shortCode}-${suffix}`;
}

function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

// --- create order ----------------------------------------------------

async function createPaymentOrder(userId, eventSlug) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) throw new AppError('Event not found.', 404);

  if (Number(event.registrationFee) <= 0) {
    throw new AppError('This event is free — use the free registration flow instead.', 400);
  }
  if (event.status !== 'REGISTRATION_OPEN') {
    throw new AppError('Registration is not currently open for this event.', 400);
  }
  if (new Date() > event.registrationDeadline) {
    throw new AppError('The registration deadline for this event has passed.', 400);
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
  });
  if (existing && existing.status === 'CONFIRMED') {
    throw new AppError('You are already registered for this event.', 409);
  }

  // Paid events don't support waitlisting in this phase — charging a
  // waitlisted student who may never get a seat is a refund headache
  // we're not building yet. Simple and honest: reject if full.
  const confirmedCount = await prisma.eventRegistration.count({
    where: { eventId: event.id, status: 'CONFIRMED' },
  });
  if (confirmedCount >= event.maxParticipants) {
    throw new AppError('This event is full.', 400);
  }

  const amountInPaise = Math.round(Number(event.registrationFee) * 100);

  // Reuse the existing PENDING_PAYMENT registration row if the student
  // is retrying a failed/abandoned checkout, instead of creating a
  // second orphaned registration for the same event.
  const registration = await prisma.eventRegistration.upsert({
    where: { userId_eventId: { userId, eventId: event.id } },
    update: { status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
    create: {
      userId,
      eventId: event.id,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      registrationCode: generateRegistrationCode(event.slug),
      qrToken: generateQrToken(),
    },
  });

  const order = await razorpayUtil.createOrder({
    amountInPaise,
    receipt: registration.id,
    notes: { eventId: event.id, userId, registrationId: registration.id },
  });

  await prisma.payment.upsert({
    where: { registrationId: registration.id },
    update: { orderId: order.id, amount: event.registrationFee, status: 'PENDING' },
    create: {
      userId,
      eventId: event.id,
      registrationId: registration.id,
      orderId: order.id,
      amount: event.registrationFee,
      status: 'PENDING',
    },
  });

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: env.razorpay.keyId,
    eventTitle: event.title,
  };
}

// --- verify + confirm --------------------------------------------------

async function verifyAndConfirmPayment(userId, { orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) {
    throw new AppError('Missing payment verification details.', 400);
  }

  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) throw new AppError('Payment record not found.', 404);
  if (payment.userId !== userId) throw new AppError('This payment does not belong to your account.', 403);
  if (payment.status === 'PAID') {
    // Idempotent: if the client retries after a network blip post-success,
    // don't re-process or double-send confirmation email.
    return { status: 'PAID', registrationId: payment.registrationId };
  }

  const isValid = razorpayUtil.verifySignature({ orderId, paymentId, signature });

  if (!isValid) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', paymentId, signature } });
    throw new AppError('Payment verification failed. If money was deducted, contact the club — do not retry blindly.', 400);
  }

  const registration = await prisma.eventRegistration.update({
    where: { id: payment.registrationId },
    data: { status: 'CONFIRMED', paymentStatus: 'PAID' },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PAID', paymentId, signature },
  });

  const [event, user] = await Promise.all([
    prisma.event.findUnique({ where: { id: registration.eventId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const regMail = templates.registrationConfirmed(user.name, event.title, registration.registrationCode);
  await sendMail({ to: user.email, ...regMail }).catch(() => {});
  const payMail = templates.paymentSuccess(user.name, event.title, payment.amount);
  await sendMail({ to: user.email, ...payMail }).catch(() => {});

  await prisma.notification
    .create({
      data: {
        userId,
        eventId: event.id,
        title: 'Payment successful',
        message: `Your payment for ${event.title} was confirmed. Registration ID: ${registration.registrationCode}.`,
        type: 'PAYMENT',
      },
    })
    .catch(() => {});

  return { status: 'PAID', registration };
}

module.exports = { createPaymentOrder, verifyAndConfirmPayment };
