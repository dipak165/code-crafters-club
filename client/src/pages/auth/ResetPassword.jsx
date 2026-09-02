import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authApi } from '../../services/auth.service';

const schema = z
  .object({
    otp: z.string().length(6, 'Enter the 6-digit OTP.'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters.')
      .regex(/[A-Z]/, 'Needs an uppercase letter.')
      .regex(/[a-z]/, 'Needs a lowercase letter.')
      .regex(/[0-9]/, 'Needs a number.')
      .regex(/[^A-Za-z0-9]/, 'Needs a special character.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  if (!email) {
    return (
      <AuthLayout title="Reset password">
        <p className="text-center text-sm text-ink-muted">
          Missing email context. <Link to="/forgot-password" className="text-copper">Start over</Link>
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await authApi.resetPassword({ email, ...values });
      toast.success('Password reset. Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle={<>Enter the OTP sent to <span className="font-mono text-ink">{email}</span></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="field-label">OTP</label>
          <input className="field-input font-mono tracking-widest" {...register('otp')} placeholder="000000" maxLength={6} />
          {errors.otp && <p className="field-error">{errors.otp.message}</p>}
        </div>

        <div>
          <label className="field-label">New password</label>
          <input className="field-input" type="password" {...register('newPassword')} placeholder="••••••••" />
          {errors.newPassword && <p className="field-error">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="field-label">Confirm new password</label>
          <input className="field-input" type="password" {...register('confirmPassword')} placeholder="••••••••" />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
