import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { recruitmentApi } from '../services/recruitment.service';
import { TEAM_LABELS } from '../utils/roles';

const TEAMS = ['TECHNICAL_TEAM', 'EVENT_MANAGEMENT_TEAM', 'HOSPITALITY_TEAM', 'CONTENT_TEAM', 'MARKETING_TEAM'];
const currentYear = new Date().getFullYear();

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  phone: z.string().trim().regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number.'),
  graduationYear: z.coerce.number().int().min(currentYear, 'Cannot be in the past.').max(currentYear + 6),
  skills: z.string().trim().optional(),
  teamPreference: z.enum(TEAMS),
  motivation: z.string().trim().min(20, 'Please write at least a few sentences.'),
  experience: z.string().trim().optional(),
  githubUrl: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
  linkedinUrl: z.string().trim().url('Must be a valid URL.').optional().or(z.literal('')),
});

export default function Recruitment() {
  const [resume, setResume] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([key, value]) => fd.append(key, value ?? ''));
      if (resume) fd.append('resume', resume);
      await recruitmentApi.apply(fd);
      setSubmitted(true);
      reset();
      setResume(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="font-mono text-sm text-active">✓ Application submitted</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">Thanks for applying!</h1>
        <p className="mt-3 text-sm text-ink-muted">
          We've sent a confirmation to your email. Our team reviews applications on a rolling basis — we'll be in touch soon.
        </p>
        <button onClick={() => setSubmitted(false)} className="btn-secondary mt-6">Submit another application</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow mb-3">Get involved</p>
      <h1 className="font-display text-4xl font-semibold text-ink">Join Code Crafters Club</h1>
      <p className="mt-3 text-ink-muted">
        We recruit across five teams — Technical, Event Management, Hospitality, Content, and Marketing.
        Tell us a bit about yourself and where you'd like to contribute.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="card mt-8 space-y-4 p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <input className="field-input" {...register('name')} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input className="field-input" type="email" {...register('email')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" error={errors.phone}>
            <input className="field-input" {...register('phone')} placeholder="9876543210" />
          </Field>
          <Field label="Graduation year" error={errors.graduationYear}>
            <input className="field-input" type="number" {...register('graduationYear')} />
          </Field>
        </div>

        <Field label="Team preference" error={errors.teamPreference}>
          <select className="field-input" {...register('teamPreference')}>
            {TEAMS.map((t) => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
          </select>
        </Field>

        <Field label="Skills (comma-separated)" error={errors.skills}>
          <input className="field-input" {...register('skills')} placeholder="React, Figma, Public speaking…" />
        </Field>

        <Field label="Why do you want to join?" error={errors.motivation}>
          <textarea rows={4} className="field-input resize-none" {...register('motivation')} />
        </Field>

        <Field label="Previous experience (optional)" error={errors.experience}>
          <textarea rows={3} className="field-input resize-none" {...register('experience')} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub (optional)" error={errors.githubUrl}>
            <input className="field-input" {...register('githubUrl')} placeholder="https://github.com/…" />
          </Field>
          <Field label="LinkedIn (optional)" error={errors.linkedinUrl}>
            <input className="field-input" {...register('linkedinUrl')} placeholder="https://linkedin.com/in/…" />
          </Field>
        </div>

        <div>
          <label className="field-label">Resume (PDF, optional, max 5MB)</label>
          <input type="file" accept="application/pdf" onChange={(e) => setResume(e.target.files[0])} className="text-sm text-ink-muted" />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </div>
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
