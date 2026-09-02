const router = require('express').Router();
const controller = require('../controllers/feedback.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { submitFeedbackSchema } = require('../validators/feedback.validator');

// Public — aggregate averages only, never individual comments.
router.get('/events/:slug/feedback/summary', controller.publicSummary);

// Student-facing
router.post('/events/:slug/feedback', protect, validate(submitFeedbackSchema), controller.submit);
router.get('/events/:slug/feedback/me', protect, controller.mine);

// Staff — full detail including comments/suggestions, gated by
// VIEW_ANALYTICS (the same broad "staff insight" permission granted
// to President/VP/Technical Team/Super Admin) rather than a
// dedicated permission, since reviewing feedback is exactly that
// kind of insight, not a content-management action.
router.get('/events/:eventId/feedback', protect, requirePermission('VIEW_ANALYTICS'), controller.staffDetail);

module.exports = router;
