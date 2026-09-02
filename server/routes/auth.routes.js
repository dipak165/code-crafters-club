const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter.middleware');
const {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), controller.verifyOtp);
router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), controller.resendOtp);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), controller.resetPassword);
router.post('/refresh-token', controller.refreshToken);
router.post('/logout', controller.logout);
router.get('/me', protect, controller.me);

module.exports = router;
