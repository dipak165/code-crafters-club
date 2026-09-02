import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authApi } from '../../services/auth.service';

const currentYear = new Date().getFullYear();

const schema = z
.object({
name: z.string().trim().min(2, 'Enter your full name.'),


email: z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.'),

phone: z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number.'),

collegeName: z
  .string()
  .trim()
  .min(2, 'Enter your college name.'),

graduationYear: z
  .coerce
  .number()
  .int()
  .min(currentYear, 'Cannot be in the past.')
  .max(currentYear + 6),

password: z
  .string()
  .min(8, 'At least 8 characters.')
  .regex(/[A-Z]/, 'Needs an uppercase letter.')
  .regex(/[a-z]/, 'Needs a lowercase letter.')
  .regex(/[0-9]/, 'Needs a number.')
  .regex(/[^A-Za-z0-9]/, 'Needs a special character.'),

confirmPassword: z.string(),

acceptedTerms: z
  .boolean()
  .refine((value) => value === true, 'You must accept the terms.'),


})
.refine((data) => data.password === data.confirmPassword, {
message: 'Passwords do not match.',
path: ['confirmPassword'],
});

export default function Register() {
const navigate = useNavigate();
const [submitting, setSubmitting] = useState(false);

const {
register,
handleSubmit,
formState: { errors },
} = useForm({
resolver: zodResolver(schema),
});

const onSubmit = async (values) => {
setSubmitting(true);

try {
  const response = await authApi.register(values);

  const email = response.data.data?.email || values.email;

  toast.success('Account created. Check your email for the OTP.');

  navigate('/verify-otp', {
    state: { email },
  });
} catch (err) {
  toast.error(
    err.response?.data?.message ||
    'Registration failed. Please try again.'
  );
} finally {
  setSubmitting(false);
}


};

return (
<AuthLayout
title="Create your account"
subtitle="Join Code Crafters Club to register for events and earn certificates."
footer={
<>
Already have an account?{' '} <Link
         to="/login"
         className="text-copper hover:text-copper-bright"
       >
Log in </Link>
</>
}
> <form
     onSubmit={handleSubmit(onSubmit)}
     className="space-y-4"
     noValidate
   > <Field label="Full name" error={errors.name}>
<input
className="field-input"
{...register('name')}
placeholder="Dipak Shinde"
/> </Field>


    <Field label="Email" error={errors.email}>
      <input
        className="field-input"
        type="email"
        {...register('email')}
        placeholder="you@college.edu"
      />
    </Field>

    <div className="grid grid-cols-2 gap-4">
      <Field label="Phone number" error={errors.phone}>
        <input
          className="field-input"
          {...register('phone')}
          placeholder="9876543210"
        />
      </Field>

      <Field
        label="Graduation year"
        error={errors.graduationYear}
      >
        <input
          className="field-input"
          type="number"
          {...register('graduationYear')}
          placeholder={String(currentYear + 1)}
        />
      </Field>
    </div>

    <Field label="College name" error={errors.collegeName}>
      <input
        className="field-input"
        {...register('collegeName')}
        placeholder="XYZ College of Engineering"
      />
    </Field>

    <Field label="Password" error={errors.password}>
      <input
        className="field-input"
        type="password"
        {...register('password')}
        placeholder="••••••••"
      />
    </Field>

    <Field
      label="Confirm password"
      error={errors.confirmPassword}
    >
      <input
        className="field-input"
        type="password"
        {...register('confirmPassword')}
        placeholder="••••••••"
      />
    </Field>

    <label className="flex items-start gap-2.5 text-xs text-ink-muted">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        {...register('acceptedTerms')}
      />

      <span>
        I agree to the club's terms and conditions and code of conduct.
      </span>
    </label>

    {errors.acceptedTerms && (
      <p className="field-error !mt-0">
        {errors.acceptedTerms.message}
      </p>
    )}

    <button
      type="submit"
      disabled={submitting}
      className="btn-primary w-full"
    >
      {submitting ? 'Creating account...' : 'Create account'}
    </button>
  </form>
</AuthLayout>


);
}

function Field({ label, error, children }) {
return ( <div> <label className="field-label">{label}</label>

  {children}

  {error && (
    <p className="field-error">
      {error.message}
    </p>
  )}
</div>


);
}
