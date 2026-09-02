import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const CATEGORIES = [
  'HACKATHON', 'WORKSHOP', 'SEMINAR', 'WEBDEV', 'AI_ML', 'IOT_EMBEDDED',
  'PROJECT_EXHIBITION', 'GAMING', 'PLACEMENT_PREP', 'GUEST_LECTURE', 'TEAM_BUILDING', 'TECH_FEST', 'OTHER',
];
const MODES = ['ONLINE', 'OFFLINE', 'HYBRID'];
const STATUSES = ['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'CANCELLED'];

// Mirrors server/validators/event.validator.js — datetime-local inputs
// give plain strings, coerced to Date here just like the backend does.
const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'At least 3 characters.')
      .max(150),

    description: z
      .string()
      .trim()
      .min(10, 'At least 10 characters.'),

    category: z.enum(CATEGORIES),

    bannerUrl: z
      .string()
      .trim()
      .url('Must be a valid URL.')
      .optional()
      .or(z.literal('')),

    eventDate: z.string().min(1, 'Required.'),

    startTime: z.string().min(1, 'Required.'),

    endTime: z.string().min(1, 'Required.'),

    registrationStart: z.string().min(1, 'Required.'),

    registrationDeadline: z.string().min(1, 'Required.'),

    venue: z.string().trim().optional(),

    mode: z.enum(MODES),

    meetingLink: z
      .string()
      .trim()
      .url('Must be a valid URL.')
      .optional()
      .or(z.literal('')),

    maxParticipants: z
      .coerce
      .number()
      .int()
      .positive('Must be at least 1.'),

    registrationFee: z
      .coerce
      .number()
      .min(0)
      .default(0),

    eligibility: z.string().trim().optional(),

    rules: z.string().trim().optional(),

    prizeDetails: z.string().trim().optional(),

    speaker: z.string().trim().optional(),

    speakerDesignation: z.string().trim().optional(),

    certificateEnabled: z.boolean().default(true),

    status: z.enum(STATUSES).default('DRAFT'),
  })

 .superRefine((data, ctx) => {
  const eventDate = new Date(data.eventDate);
  const registrationDeadline = new Date(data.registrationDeadline);
  const registrationStart = new Date(data.registrationStart);
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // Venue validation
  if (
    ['OFFLINE', 'HYBRID'].includes(data.mode) &&
    !data.venue?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['venue'],
      message: 'Venue is required for offline or hybrid events.',
    });
  }

  // Meeting link validation
  if (
    ['ONLINE', 'HYBRID'].includes(data.mode) &&
    !data.meetingLink?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['meetingLink'],
      message: 'Meeting link is required for online or hybrid events.',
    });
  }

  // Registration deadline <= event date
  if (registrationDeadline > eventDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['registrationDeadline'],
      message:
        'Registration deadline must be on or before the event date.',
    });
  }

  // Registration start <= registration deadline
  if (registrationStart > registrationDeadline) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['registrationStart'],
      message:
        'Registration must open before the registration deadline.',
    });
  }

  // End time > start time
  if (endTime <= startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'End time must be after the start time.',
    });
  }
});
export default function EventForm({ defaultValues, onSubmit, submitting, submitLabel = 'Save event' }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Title" error={errors.title}>
        <input className="field-input" {...register('title')} placeholder="TechNova 2026" />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea rows={4} className="field-input resize-none" {...register('description')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={errors.category}>
          <select className="field-input" {...register('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </Field>
        <Field label="Mode" error={errors.mode}>
          <select className="field-input" {...register('mode')}>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Banner image URL" error={errors.bannerUrl}>
        <input className="field-input" {...register('bannerUrl')} placeholder="https://…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue" error={errors.venue}>
          <input className="field-input" {...register('venue')} placeholder="Seminar Hall" />
        </Field>
        <Field label="Meeting link (if online/hybrid)" error={errors.meetingLink}>
          <input className="field-input" {...register('meetingLink')} placeholder="https://meet…" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event date" error={errors.eventDate}>
          <input type="date" className="field-input" {...register('eventDate')} />
        </Field>
        <Field label="Registration deadline" error={errors.registrationDeadline}>
          <input type="date" className="field-input" {...register('registrationDeadline')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start time" error={errors.startTime}>
          <input type="datetime-local" className="field-input" {...register('startTime')} />
        </Field>
        <Field label="End time" error={errors.endTime}>
          <input type="datetime-local" className="field-input" {...register('endTime')} />
        </Field>
      </div>

      <Field label="Registration opens" error={errors.registrationStart}>
        <input type="datetime-local" className="field-input" {...register('registrationStart')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max participants" error={errors.maxParticipants}>
          <input type="number" className="field-input" {...register('maxParticipants')} />
        </Field>
        <Field label="Registration fee (₹, 0 = free)" error={errors.registrationFee}>
          <input type="number" step="0.01" className="field-input" {...register('registrationFee')} />
        </Field>
      </div>

      <Field label="Eligibility" error={errors.eligibility}>
        <input className="field-input" {...register('eligibility')} placeholder="Open to all students" />
      </Field>
      <Field label="Rules" error={errors.rules}>
        <textarea rows={3} className="field-input resize-none" {...register('rules')} />
      </Field>
      <Field label="Prize details" error={errors.prizeDetails}>
        <textarea rows={2} className="field-input resize-none" {...register('prizeDetails')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Speaker" error={errors.speaker}>
          <input className="field-input" {...register('speaker')} />
        </Field>
        <Field label="Speaker designation" error={errors.speakerDesignation}>
          <input className="field-input" {...register('speakerDesignation')} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" error={errors.status}>
          <select className="field-input" {...register('status')}>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-ink-muted">
          <input type="checkbox" className="h-4 w-4" {...register('certificateEnabled')} />
          Issue certificates for this event
        </label>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {error && <p className="field-error">{error.message}</p>}
    </div>
  );
}
