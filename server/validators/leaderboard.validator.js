const { z } = require('zod');

const updateRuleSchema = z.object({
  points: z.coerce.number().int().min(0).max(1000),
});

const awardPointsSchema = z.object({
  userId: z.string().trim().min(1, 'Student is required.'),
  action: z.enum(['EVENT_PARTICIPATION', 'WORKSHOP', 'HACKATHON', 'WIN', 'VOLUNTEER', 'CERTIFICATE']),
  eventId: z.string().trim().optional().or(z.literal('')),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

module.exports = { updateRuleSchema, awardPointsSchema };
