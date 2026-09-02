const jwt = require('jsonwebtoken');
const { verifyAccessToken, signAccessToken } = require('../../utils/jwt.util');

describe('jwt.util — algorithm confusion hardening', () => {
  test('a legitimately signed token still verifies correctly', () => {
    const token = signAccessToken({ id: 'u1', role: 'STUDENT', emailVerified: true });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
  });

  test('a forged alg:none token (no signature at all) is rejected', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'attacker', role: 'SUPER_ADMIN' })).toString('base64url');
    const forgedToken = `${header}.${payload}.`;

    expect(() => verifyAccessToken(forgedToken)).toThrow();
  });

  test('a token signed with a different algorithm the app never uses is rejected', () => {
    // Explicitly pinning to HS256 in jwt.util means even a validly-signed
    // HS384/HS512 token (which would otherwise share the same secret
    // format) must not verify.
    const token = jwt.sign({ sub: 'u1' }, process.env.JWT_ACCESS_SECRET, { algorithm: 'HS384' });
    expect(() => verifyAccessToken(token)).toThrow();
  });
});
