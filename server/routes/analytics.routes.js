const router = require('express').Router();
const controller = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.use(protect, requirePermission('VIEW_ANALYTICS'));

router.get('/overview', controller.overview);
router.get('/registrations-by-month', controller.registrationsByMonth);
router.get('/events-by-category', controller.eventsByCategory);
router.get('/revenue-by-event', controller.revenueByEvent);
router.get('/students-by-graduation-year', controller.studentsByGraduationYear);

module.exports = router;
