const { z } = require('zod');

// Spec section 47 lists exactly these 5 teams as recruitment targets —
// deliberately NOT including PRESIDENT/VICE_PRESIDENT, since those
// roles aren't something you apply for through an open form.
const TEAM_PREFERENCES = [
  'TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM',
];

const currentYear = new Date().getFullYear();

const applySchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number.'),
  graduationYear: z.coerce.number().int().min(currentYear, 'Cannot be in the past.').max(currentYear + 6),
  skills: z.preprocess(
    (val) => (typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : val),
    z.array(z.string()).default([])
  ),
  teamPreference: z.enum(TEAM_PREFERENCES),
  motivation: z.string().trim().min(20, 'Please write at least a few sentences.').max(2000),
  experience: z.string().trim().max(2000).optional().or(z.literal('')),
  githubUrl: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  linkedinUrl: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
});

const updateStatusSchema = z.object({
  status: z.enum(['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED']),
});

module.exports = { applySchema, updateStatusSchema, TEAM_PREFERENCES };
