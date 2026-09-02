const { z } = require('zod');

const ratingField = z.coerce.number().int().min(1).max(5);

const submitFeedbackSchema = z.object({
  rating: ratingField,
  speakerRating: ratingField.optional(),
  organizationRating: ratingField.optional(),
  comments: z.string().trim().max(2000).optional().or(z.literal('')),
  suggestions: z.string().trim().max(2000).optional().or(z.literal('')),
});

module.exports = { submitFeedbackSchema };
