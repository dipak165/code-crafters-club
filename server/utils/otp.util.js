const crypto = require('crypto');
const bcrypt = require('bcrypt');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const OTP_SALT_ROUNDS = 10;

function generateOtp() {
  // crypto.randomInt is CSPRNG-backed — never use Math.random()
  // for anything security-relevant like an OTP.
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return crypto.randomInt(min, max + 1).toString();
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, OTP_SALT_ROUNDS);
}

async function compareOtp(otp, hash) {
  return bcrypt.compare(otp, hash);
}

function getOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

module.exports = {
  OTP_TTL_MINUTES,
  generateOtp,
  hashOtp,
  compareOtp,
  getOtpExpiry,
};
