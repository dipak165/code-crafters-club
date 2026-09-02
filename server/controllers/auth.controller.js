const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');
const env = require('../config/env');

const REFRESH_COOKIE_NAME = 'ccc_refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth', // scoped to auth routes only
};

exports.register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body, req.ip);
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email for the verification OTP.',
    data: result,
  });
});

exports.verifyOtp = catchAsync(async (req, res) => {
  await authService.verifyOtp(req.body, 'EMAIL_VERIFICATION');
  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  });
});

exports.resendOtp = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body, req.body.purpose === 'PASSWORD_RESET' ? 'PASSWORD_RESET' : 'EMAIL_VERIFICATION');
  res.status(200).json({ success: true, message: 'OTP resent. Please check your email.' });
});

exports.login = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, req.ip);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: { user, accessToken },
  });
});

exports.refreshToken = catchAsync(async (req, res) => {
  const incoming = req.cookies?.[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refreshAccessToken(incoming);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

exports.logout = catchAsync(async (req, res) => {
  const incoming = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(incoming);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body, req.ip);
  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, a reset OTP has been sent.',
  });
});

exports.resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
});

exports.me = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, data: authService.sanitizeUser(req.user) });
});
