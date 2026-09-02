const { z } = require('zod');

const createOrderSchema = z.object({
  eventSlug: z.string().trim().min(1, 'Event is required.'),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().trim().min(1),
  paymentId: z.string().trim().min(1),
  signature: z.string().trim().min(1),
});

module.exports = { createOrderSchema, verifyPaymentSchema };
