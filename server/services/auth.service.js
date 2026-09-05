const prisma = require('../config/db');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { generateOtp, hashOtp, compareOtp, getOtpExpiry } = require('../utils/otp.util');
const { sendMail, templates } = require('../utils/email.util');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt.util');


const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// --- helpers -------------------------------------------------

async function issueOtp(userId, purpose) {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);

  // One active OTP per (user, purpose) at a time -- clear stale ones.
  await prisma.otpVerification.deleteMany({
    where: { userId, purpose, verifiedAt: null },
  });

  await prisma.otpVerification.create({
    data: { userId, purpose, otpHash, expiresAt: getOtpExpiry() },
  });

  return otp;
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken };
}

function sanitizeUser(user) {
  // Never send passwordHash (or internal fields) to the client.
  const { passwordHash, ...safe } = user;
  return safe;
}

// --- public service methods -----------------------------------

// async function register(input, ip) {
//   const captchaOk = await verifyCaptcha(input.captchaToken, ip);
//   if (!captchaOk) throw new AppError('Captcha verification failed.', 400);

//   const existing = await prisma.user.findUnique({ where: { email: input.email } });
//   if (existing) throw new AppError('An account with this email already exists.', 409);

//   const passwordHash = await hashPassword(input.password);

//   const user = await prisma.user.create({
//     data: {
//       name: input.name,
//       email: input.email,
//       passwordHash,
//       phone: input.phone,
//       collegeName: input.collegeName,
//       graduationYear: input.graduationYear,
//       role: 'STUDENT',
//     },
//   });

//   const otp = await issueOtp(user.id, 'EMAIL_VERIFICATION');
//   const mail = templates.otp(user.name, otp, 'account verification');
//   await sendMail({ to: user.email, ...mail });

//   return { email: user.email };
// }/


async function register(input) {
const existing = await prisma.user.findUnique({
where: { email: input.email },
});

if (existing) {
throw new AppError('An account with this email already exists.', 409);
}

const passwordHash = await hashPassword(input.password);

const user = await prisma.user.create({
data: {
name: input.name,
email: input.email,
passwordHash,
phone: input.phone,
collegeName: input.collegeName,
graduationYear: input.graduationYear,
role: 'STUDENT',
},
});

const otp = await issueOtp(user.id, 'EMAIL_VERIFICATION');

const mail = templates.otp(
user.name,
otp,
'account verification'
);

try {
  await sendMail({
    to: user.email,
    ...mail,
  });
} catch (error) {
  console.error("Failed to send OTP email:", error.message);
}

return {
email: user.email,
};
}


async function verifyOtp({ email, otp }, purpose = 'EMAIL_VERIFICATION') {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Account not found.', 404);

  const record = await prisma.otpVerification.findFirst({
    where: { userId: user.id, purpose, verifiedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) throw new AppError('No pending OTP found. Please request a new one.', 400);
  if (record.expiresAt < new Date()) throw new AppError('OTP has expired. Please request a new one.', 400);
  if (record.attempts >= record.maxAttempts) {
    throw new AppError('Too many incorrect attempts. Please request a new OTP.', 429);
  }

  const isValid = await compareOtp(otp, record.otpHash);
  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError('Incorrect OTP.', 400);
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  if (purpose === 'EMAIL_VERIFICATION') {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  return user;
}

async function resendOtp({ email }, purpose = 'EMAIL_VERIFICATION') {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('Account not found.', 404);
  if (purpose === 'EMAIL_VERIFICATION' && user.emailVerified) {
    throw new AppError('Email is already verified.', 400);
  }

  const otp = await issueOtp(user.id, purpose);
  const label = purpose === 'PASSWORD_RESET' ? 'password reset' : 'account verification';
  const mail = templates.otp(user.name, otp, label);
  await sendMail({ to: user.email, ...mail });

  return true;
}

async function login({ email, password }) {
const user = await prisma.user.findUnique({
where: { email },
});

if (!user) {
throw new AppError('Invalid email or password.', 401);
}

if (!user.isActive) {
throw new AppError('This account has been deactivated.', 403);
}

if (!user.emailVerified) {
throw new AppError('Please verify your email before logging in.', 403);
}

const passwordOk = await comparePassword(
password,
user.passwordHash
);

if (!passwordOk) {
throw new AppError('Invalid email or password.', 401);
}

const tokens = await issueTokenPair(user);

return {
user: sanitizeUser(user),
...tokens,
};
}


async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token missing.', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.isActive) throw new AppError('Account no longer exists.', 401);

  // Rotate: revoke the old refresh token, issue a new pair.
  // Prevents replay if an old token leaks.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function forgotPassword({ email, captchaToken }, ip) {
  const captchaOk = await verifyCaptcha(captchaToken, ip);
  if (!captchaOk) throw new AppError('Captcha verification failed.', 400);

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success-shaped, even if the account doesn't
  // exist, so this endpoint can't be used to enumerate emails.
  if (!user) return true;

  const otp = await issueOtp(user.id, 'PASSWORD_RESET');
  const mail = templates.otp(user.name, otp, 'password reset');
  await sendMail({ to: user.email, ...mail });
  return true;
}

async function resetPassword({ email, otp, newPassword }) {
  const user = await verifyOtp({ email, otp }, 'PASSWORD_RESET');
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Invalidate every existing session -- a password reset should
  // kick out anyone who might have had access to the old password.
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return true;
}

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  sanitizeUser,
};
