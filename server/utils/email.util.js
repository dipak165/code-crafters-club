const nodemailer = require("nodemailer");



const env = require("../config/env");



const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: env.smtp.user,
pass: env.smtp.password,
},
});

// Test SMTP connection when the server starts
transporter.verify()
.then(() => {
console.log("✅ Gmail SMTP server is ready to send emails");
})
.catch((error) => {
console.error("❌ SMTP ERROR:", error.message);
});

async function sendMail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent:', info.messageId);

    return info;
  } catch (error) {
    console.error('❌ EMAIL SENDING ERROR:', error);
    throw error;
  }
}

const templates = {
  otp: (name, otp, purposeLabel = 'verification') => ({
    subject: `Your Code Crafters Club ${purposeLabel} OTP`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#1e1b4b;">CODE CRAFTERS CLUB</h2>
        <p>Hi ${name},</p>
        <p>Your ${purposeLabel} OTP is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        <p>This OTP will expire in 5 minutes. Do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>`,
  }),

  registrationConfirmed: (name, eventTitle, registrationCode) => ({
    subject: `Registration confirmed: ${eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#1e1b4b;">CODE CRAFTERS CLUB</h2>
        <p>Hi ${name},</p>
        <p>Your registration for <strong>${eventTitle}</strong> is confirmed.</p>
        <p>Registration ID: <strong>${registrationCode}</strong></p>
        <p>You can view your event pass and QR code from "My Events" in your dashboard.</p>
      </div>`,
  }),

  paymentSuccess: (name, eventTitle, amount) => ({
    subject: `Payment successful: ${eventTitle}`,
    html: `<div style="font-family: sans-serif;"><p>Hi ${name},</p>
      <p>We received your payment of ₹${amount} for <strong>${eventTitle}</strong>. Your seat is confirmed.</p></div>`,
  }),

  certificateReady: (name, eventTitle, certificateCode) => ({
    subject: `Your certificate for ${eventTitle} is ready`,
    html: `<div style="font-family: sans-serif;"><p>Hi ${name},</p>
      <p>Your e-certificate for <strong>${eventTitle}</strong> is ready to download.</p>
      <p>Certificate ID: <strong>${certificateCode}</strong></p></div>`,
  }),

  eventReminder: (name, eventTitle, whenLabel) => ({
    subject: `Reminder: ${eventTitle} is ${whenLabel}`,
    html: `<div style="font-family: sans-serif;"><p>Hi ${name},</p>
      <p>This is a reminder that <strong>${eventTitle}</strong> is ${whenLabel}. See you there!</p></div>`,
  }),
};

module.exports = { sendMail, templates };
