const { z } = require('zod');

const teamEnum = z.enum([
  'PRESIDENT', 'VICE_PRESIDENT', 'TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM',
  'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM',
]);

// Multipart form fields arrive as strings, so numbers/booleans/arrays
// need coercion — skills comes in as a comma-separated string from
// the form and is split before validation.
const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid registered student email is required.'),
  year: z.coerce.number().int().min(2000).max(2100),
  team: teamEnum,
  position: z.string().trim().min(2, 'Position/title is required.'),
  skills: z.preprocess(
    (val) => (typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val),
    z.array(z.string()).default([])
  ),
  description: z.string().trim().max(1000).optional().nullable(),
  linkedinUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  githubUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  portfolioUrl: z.string().trim().url().optional().or(z.literal('')).nullable(),
  showContact: z.coerce.boolean().default(false),
});

const updateMemberSchema = addMemberSchema.partial().omit({ email: true, year: true });

module.exports = { addMemberSchema, updateMemberSchema };
