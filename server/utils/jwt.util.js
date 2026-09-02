const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

// Access token: short-lived, sent in Authorization header, holds
// the claims the API needs on every request (id + role) so we
// don't hit the DB just to know who's calling.
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, emailVerified: user.emailVerified },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

// Refresh token: long-lived, opaque-looking, stored HTTP-only +
// secure cookie. We also persist a HASH of it in the DB
// (RefreshToken table) so it can be revoked (logout / password
// reset / suspicious activity) even though JWTs are otherwise
// stateless.
function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  // Explicitly pin the algorithm rather than trusting jsonwebtoken's
  // default behavior. A token's header claims its own algorithm —
  // if verify() ever inferred the algorithm from that claim instead
  // of a fixed allowlist, a forged token claiming "alg: none" or an
  // asymmetric algorithm could bypass signature checking entirely
  // (a real, historically-exploited class of JWT bug). Pinning here
  // costs nothing and removes any ambiguity.
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
