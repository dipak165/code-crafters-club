const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { verifyAccessToken } = require("../utils/jwt.util");
const prisma = require("../config/db");

// Verifies the access token and attaches the current user to
// req.user. This is the ONLY place identity is established --
// every downstream permission check trusts req.user, never
// anything read from the request body.
const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("You are not logged in. Please log in to continue.", 401);
  }

  const token = header.split(" ")[1];
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw new AppError("Invalid or expired session. Please log in again.", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || !user.isActive) {
    throw new AppError("Account no longer exists or is deactivated.", 401);
  }

  req.user = user;
  next();
});

// Optional auth: attaches req.user if a valid token is present,
// but does not reject the request otherwise.
const attachUserIfPresent = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = verifyAccessToken(header.split(" ")[1]);
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (user && user.isActive) req.user = user;
    } catch (err) {
      // ignore -- treat as anonymous
    }
  }
  next();
});

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user.emailVerified) {
    throw new AppError("Please verify your email before continuing.", 403);
  }
  next();
};

module.exports = { protect, attachUserIfPresent, requireVerifiedEmail };
