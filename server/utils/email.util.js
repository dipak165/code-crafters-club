const nodemailer = require("nodemailer");
const env = require("../config/env");

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false, // port 587 uses STARTTLS
  auth: {
    user: env.smtp.user,
    pass: env.smtp.password,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

// Test SMTP connection when the server starts
transporter
  .verify()
  .then(() => {
    console.log("✅ Gmail SMTP server is ready to send emails");
  })
  .catch((error) => {
    console.error("❌ SMTP ERROR:", error.message);
  });

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });
}

const templates = {
  otp(name, otp, purpose) {
    return {
      subject: `Code Crafters Club - ${purpose}`,
      text: `Hello ${name}, your OTP is ${otp}.`,
      html: `
        <h2>Hello ${name}</h2>
        <p>Your OTP for ${purpose} is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire soon.</p>
      `,
    };
  },
};

module.exports = {
  sendMail,
  templates,
};