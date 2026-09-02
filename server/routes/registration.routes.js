const router = require('express').Router();
const controller = require('../controllers/registration.controller');
const { protect, requireVerifiedEmail } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

// Student-facing: register / cancel for a specific event, view own registrations.
router.post('/events/:slug/register', protect, requireVerifiedEmail, controller.register);
router.delete('/events/:slug/register', protect, controller.cancel);
router.get('/registrations/me', protect, controller.myRegistrations);

// Staff-facing: view all registrations for an event.
router.get(
  '/events/:eventId/registrations',
  protect,
  requirePermission('MANAGE_REGISTRATIONS'),
  controller.eventRegistrations
);

module.exports = router;
