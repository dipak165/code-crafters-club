const router = require('express').Router();
const controller = require('../controllers/announcement.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { createAnnouncementSchema, updateAnnouncementSchema } = require('../validators/announcement.validator');

// Public
router.get('/announcements', controller.listPublished);
router.get('/announcements/:id', controller.getPublishedById);

// Staff — MANAGE_ANNOUNCEMENTS (Technical Team, Content Team, Super Admin per permission matrix)
router.get('/announcements-admin/all', protect, requirePermission('MANAGE_ANNOUNCEMENTS'), controller.listAll);
router.post('/announcements', protect, requirePermission('MANAGE_ANNOUNCEMENTS'), validate(createAnnouncementSchema), controller.create);
router.put('/announcements/:id', protect, requirePermission('MANAGE_ANNOUNCEMENTS'), validate(updateAnnouncementSchema), controller.update);
router.delete('/announcements/:id', protect, requirePermission('MANAGE_ANNOUNCEMENTS'), controller.remove);

module.exports = router;
