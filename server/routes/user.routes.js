const router = require('express').Router();
const controller = require('../controllers/user.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { updateRoleSchema } = require('../validators/user.validator');

// Role management is explicitly Super-Admin-only per spec (section 3):
// "Only Super Admin should be able to: Manage administrative roles,
// Assign roles, Remove roles." MANAGE_ROLES is granted only to
// SUPER_ADMIN in the permission matrix (config/permissions.js).
router.get('/users', protect, requirePermission('MANAGE_ROLES'), controller.search);
router.put('/users/:id/role', protect, requirePermission('MANAGE_ROLES'), validate(updateRoleSchema), controller.updateRole);

module.exports = router;
