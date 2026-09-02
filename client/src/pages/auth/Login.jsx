import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const schema = z.object({
email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
password: z.string().min(1, 'Password is required.'),
});

export default function Login() {
const { login } = useAuth();
const navigate = useNavigate();
const location = useLocation();

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
  await login(values);

  toast.success('Welcome back!');

  navigate(location.state?.from || '/dashboard');
} catch (err) {
  toast.error(err.response?.data?.message || 'Login failed.');
} finally {
  setSubmitting(false);
}


};

return (
<AuthLayout
title="Welcome back"
subtitle="Log in to register for events and view your certificates."
footer={
<>
New here?{' '} <Link
         to="/register"
         className="text-copper hover:text-copper-bright"
       >
Create an account </Link>
</>
}
> <form
     onSubmit={handleSubmit(onSubmit)}
     className="space-y-4"
     noValidate
   > <div> <label className="field-label">Email</label>

```
      <input
        className="field-input"
        type="email"
        {...register('email')}
        placeholder="you@college.edu"
      />

      {errors.email && (
        <p className="field-error">{errors.email.message}</p>
      )}
    </div>

    <div>
      <div className="flex items-center justify-between">
        <label className="field-label !mb-0">Password</label>

        <Link
          to="/forgot-password"
          className="text-xs text-copper hover:text-copper-bright"
        >
          Forgot password?
        </Link>
      </div>

      <input
        className="field-input mt-1.5"
        type="password"
        {...register('password')}
        placeholder="••••••••"
      />

      {errors.password && (
        <p className="field-error">{errors.password.message}</p>
      )}
    </div>

    <button
      type="submit"
      disabled={submitting}
      className="btn-primary w-full"
    >
      {submitting ? 'Logging in…' : 'Log in'}
    </button>
  </form>
</AuthLayout>


);
}
