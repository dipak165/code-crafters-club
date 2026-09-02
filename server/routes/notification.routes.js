const router = require('express').Router();
const controller = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/notifications/me', protect, controller.mine);
router.put('/notifications/:id/read', protect, controller.markRead);
router.put('/notifications/read-all', protect, controller.markAllRead);

module.exports = router;
