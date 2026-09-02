const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Tighter limiter for auth endpoints -- brute-force protection
// on login/OTP/password-reset per spec section 39.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in a few minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Please wait before requesting another OTP." },
});

// Public, unauthenticated form submissions (recruitment applications,
// contact form) sit outside authLimiter's scope but still shouldn't
// inherit the general API's generous 100-req/15min allowance -- fine
// for browsing, but too permissive for a form anyone can spam.
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many submissions. Please try again later." },
});

module.exports = { generalLimiter, authLimiter, otpLimiter, publicFormLimiter };
