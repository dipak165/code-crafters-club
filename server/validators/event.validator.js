const { z } = require('zod');

const categories = [
  'HACKATHON','WORKSHOP','SEMINAR','WEBDEV','AI_ML','IOT_EMBEDDED',
  'PROJECT_EXHIBITION','GAMING','PLACEMENT_PREP','GUEST_LECTURE',
  'TEAM_BUILDING','TECH_FEST','OTHER',
];
const modes = ['ONLINE', 'OFFLINE', 'HYBRID'];
const statuses = ['DRAFT','PUBLISHED','REGISTRATION_OPEN','REGISTRATION_CLOSED','ONGOING','COMPLETED','CANCELLED'];

const eventShape = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10),
  category: z.enum(categories),
  // bannerUrl: z.string().url().optional().nullable(),
  bannerUrl: z
  .string()
  .trim()
  .url()
  .optional()
  .nullable()
  .or(z.literal('')),
  eventDate: z.coerce.date(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  registrationStart: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  venue: z.string().trim().optional().nullable(),
  mode: z.enum(modes),
  // meetingLink: z.string().url().optional().nullable(),
  meetingLink: z
  .string()
  .trim()
  .url()
  .optional()
  .nullable()
  .or(z.literal('')),
  // maxParticipants: z.number().int().positive(),
  // registrationFee: z.number().min(0).default(0),
  maxParticipants: z.coerce.number().int().positive(),
registrationFee: z.coerce.number().min(0).default(0),
  eligibility: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
  prizeDetails: z.string().optional().nullable(),
  speaker: z.string().optional().nullable(),
  speakerDesignation: z.string().optional().nullable(),
  certificateEnabled: z.boolean().default(true),
  status: z.enum(statuses).default('DRAFT'),
});

// .refine() returns a ZodEffects, which has no .partial() — so the
// partial (update) schema is derived from the plain object shape,
// and the refine is applied separately to the create schema only.
const createEventSchema = eventShape.refine((d) => d.registrationDeadline <= d.eventDate, {
  message: 'Registration deadline must be on or before the event date.',
  path: ['registrationDeadline'],
});

const updateEventSchema = eventShape.partial();

module.exports = { createEventSchema, updateEventSchema };
