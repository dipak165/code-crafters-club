// Runs before every test file — provides the env vars config/env.js
// requires to not exit the process, without needing a real .env.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_USER = 'test@test.local';
process.env.SMTP_PASSWORD = 'test-password';
process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key_12345';
