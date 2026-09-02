const router = require('express').Router();
const controller = require('../controllers/event.controller');
const validate = require('../middleware/validate.middleware');
const { protect, attachUserIfPresent } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { createEventSchema, updateEventSchema } = require('../validators/event.validator');

// Public browsing — optional auth so admins/technical team also see drafts.
router.get('/', attachUserIfPresent, controller.list);
router.get('/stats/summary', controller.clubStats);
router.get('/:slug', attachUserIfPresent, controller.getBySlug);

// Admin-only mutation — only TECHNICAL_TEAM (or SUPER_ADMIN) per the permission matrix.
router.post('/', protect, requirePermission('CREATE_EVENT'), validate(createEventSchema), controller.create);
router.put('/:id', protect, requirePermission('EDIT_EVENT'), validate(updateEventSchema), controller.update);
router.delete('/:id', protect, requirePermission('DELETE_EVENT'), controller.remove);

module.exports = router;
