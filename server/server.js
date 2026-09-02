const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/db');
const { startReminderJob } = require('./jobs/reminder.job');

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Code Crafters Club API running on port ${env.port} [${env.nodeEnv}]`);
});

// Scheduled jobs don't belong running during tests (they'd fire
// against whatever DB the test suite happens to be pointed at, on a
// timer neither the tests nor the developer asked for).
if (env.nodeEnv !== 'test') {
  startReminderJob();
}

// Graceful shutdown -- close DB connections cleanly instead of
// leaving dangling connections when the process is stopped/restarted.
async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  server.close(() => process.exit(1));
});
