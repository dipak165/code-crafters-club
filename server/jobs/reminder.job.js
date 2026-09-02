const cron = require('node-cron');
const notificationService = require('../services/notification.service');

// Runs every 15 minutes. The reminder service itself is idempotent
// (checks "already sent" before creating), so this interval is a
// tuning knob for how promptly reminders go out after crossing a
// threshold, not a correctness requirement — running it every 5
// minutes or every hour would both still be correct, just earlier
// or later within the window.
function startReminderJob() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await notificationService.runEventReminders();
      if (result.sent > 0) {
        // eslint-disable-next-line no-console
        console.log(`[reminder-job] sent ${result.sent} reminder(s), checked ${result.checked} registration(s).`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[reminder-job] failed:', err);
    }
  });
}

module.exports = { startReminderJob };
