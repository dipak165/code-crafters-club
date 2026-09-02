const router = require('express').Router();
const controller = require('../controllers/attendance.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { checkInSchema } = require('../validators/attendance.validator');

router.post('/events/:eventId/checkin', protect, requirePermission('MANAGE_ATTENDANCE'), validate(checkInSchema), controller.checkIn);
router.get('/events/:eventId/checkin/summary', protect, requirePermission('MANAGE_ATTENDANCE'), controller.summary);

module.exports = router;
