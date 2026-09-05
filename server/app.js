const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitizeAlt = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const errorMiddleware = require('./middleware/error.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const AppError = require('./utils/AppError');

// Routes
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const registrationRoutes = require('./routes/registration.routes');
const paymentRoutes = require('./routes/payment.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const certificateRoutes = require('./routes/certificate.routes');
const memberRoutes = require('./routes/member.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const announcementRoutes = require('./routes/announcement.routes');
const notificationRoutes = require('./routes/notification.routes');
const recruitmentRoutes = require('./routes/recruitment.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const userRoutes = require('./routes/user.routes');
const auditLogRoutes = require('./routes/auditLog.routes');

const app = express();
// Trust Render's reverse proxy
app.set('trust proxy', 1);

// --- Homepage ------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Code Crafters Club API 🚀',
    status: 'Server is running successfully',
  });
});

// --- Security & core middleware --------------------------------
app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitizeAlt());
app.use(hpp());
app.use(generalLimiter);

// --- Health check ------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Code Crafters Club API is running.',
  });
});

// ---------------- API Routes ----------------

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', certificateRoutes);
app.use('/api', memberRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', announcementRoutes);
app.use('/api', notificationRoutes);
app.use('/api', recruitmentRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', userRoutes);
app.use('/api', auditLogRoutes);

// ---------------- 404 Handler ----------------

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

// ---------------- Error Handler ----------------

app.use(errorMiddleware);

module.exports = app;