const { z } = require('zod');

const passwordRule = z
.string()
.min(8, 'Password must be at least 8 characters long.')
.regex(/[A-Z]/, 'Password must contain an uppercase letter.')
.regex(/[a-z]/, 'Password must contain a lowercase letter.')
.regex(/[0-9]/, 'Password must contain a number.')
.regex(/[^A-Za-z0-9]/, 'Password must contain a special character.');

const registerSchema = z
.object({
name: z.string().trim().min(2, 'Name is required.').max(100),
email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
password: passwordRule,
confirmPassword: z.string(),
phone: z
.string()
.trim()
.regex(/^[0-9]{10}$/, 'Enter a valid 10-digit phone number.'),
collegeName: z.string().trim().min(2, 'College name is required.'),
graduationYear: z
.number()
.int()
.min(new Date().getFullYear(), 'Graduation year cannot be in the past.')
.max(new Date().getFullYear() + 6),
acceptedTerms: z.literal(true, {
errorMap: () => ({
message: 'You must accept the terms and conditions.',
}),
}),
})
.refine((data) => data.password === data.confirmPassword, {
message: 'Passwords do not match.',
path: ['confirmPassword'],
});

const verifyOtpSchema = z.object({
email: z.string().trim().toLowerCase().email(),
otp: z.string().length(6, 'OTP must be 6 digits.'),
});

const resendOtpSchema = z.object({
email: z.string().trim().toLowerCase().email(),
});

const loginSchema = z.object({
email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
password: z.string().min(1, 'Password is required.'),
});

const forgotPasswordSchema = z.object({
email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z
.object({
email: z.string().trim().toLowerCase().email(),
otp: z.string().length(6, 'OTP must be 6 digits.'),
newPassword: passwordRule,
confirmPassword: z.string(),
})
.refine((data) => data.newPassword === data.confirmPassword, {
message: 'Passwords do not match.',
path: ['confirmPassword'],
});

module.exports = {
registerSchema,
verifyOtpSchema,
resendOtpSchema,
loginSchema,
forgotPasswordSchema,
resetPasswordSchema,
};
