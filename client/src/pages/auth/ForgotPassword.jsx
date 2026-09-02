import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import CaptchaField from '../../components/ui/CaptchaField';
import { authApi } from '../../services/auth.service';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }) => {
    if (!captchaToken) return toast.error('Please complete the captcha.');
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email, captchaToken });
      toast.success('If that account exists, a reset OTP has been sent.');
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset OTP."
      footer={<>Remembered it? <Link to="/login" className="text-copper hover:text-copper-bright">Back to login</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" {...register('email')} placeholder="you@college.edu" />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <CaptchaField onVerify={setCaptchaToken} />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Sending…' : 'Send reset OTP'}
        </button>
      </form>
    </AuthLayout>
  );
}
