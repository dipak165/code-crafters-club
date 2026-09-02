const { z } = require('zod');

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(150),
  content: z.string().trim().min(10, 'Content must be at least 10 characters.'),
  imageUrl: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

module.exports = { createAnnouncementSchema, updateAnnouncementSchema };
