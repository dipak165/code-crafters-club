import api from './api';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload).then((r) => r.data),
  resendOtp: (payload) => api.post('/auth/resend-otp', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload).then((r) => r.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};
