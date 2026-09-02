import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authApi } from '../../services/auth.service';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const purpose = location.state?.purpose || 'EMAIL_VERIFICATION';

  const [digits, setDigits] = useState(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);

  if (!email) {
    return (
      <AuthLayout title="Verify your email">
        <p className="text-center text-sm text-ink-muted">
          Missing email context. <Link to="/register" className="text-copper">Start over</Link>
        </p>
      </AuthLayout>
    );
  }

  const handleChange = (i, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const otp = digits.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the full 6-digit OTP.');
    setSubmitting(true);
    try {
      await authApi.verifyOtp({ email, otp });
      toast.success('Email verified! You can log in now.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendOtp({ email, purpose });
      toast.success('A new OTP has been sent to your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={<>We sent a 6-digit code to <span className="font-mono text-ink">{email}</span></>}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              className="field-input h-14 w-11 text-center font-mono text-lg"
            />
          ))}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Verifying…' : 'Verify email'}
        </button>

        <p className="text-center text-xs text-ink-muted">
          Didn't get the code?{' '}
          <button type="button" onClick={handleResend} disabled={resending} className="text-copper hover:text-copper-bright">
            {resending ? 'Sending…' : 'Resend OTP'}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
