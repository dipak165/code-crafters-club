// Manual Jest mock — auto-used whenever a test calls jest.mock('../../utils/email.util').
// Every test cares that an email WOULD be sent, not that real SMTP fires.
module.exports = {
  sendMail: jest.fn().mockResolvedValue(undefined),
  templates: {
    otp: jest.fn(() => ({ subject: 'otp', html: '' })),
    registrationConfirmed: jest.fn(() => ({ subject: 'reg', html: '' })),
    paymentSuccess: jest.fn(() => ({ subject: 'pay', html: '' })),
    certificateReady: jest.fn(() => ({ subject: 'cert', html: '' })),
    eventReminder: jest.fn(() => ({ subject: 'reminder', html: '' })),
  },
};
