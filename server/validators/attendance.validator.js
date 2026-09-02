const { z } = require('zod');

const checkInSchema = z.object({
  qrToken: z.string().trim().min(10, 'Invalid QR code.'),
});

module.exports = { checkInSchema };
