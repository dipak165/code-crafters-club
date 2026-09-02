const router = require('express').Router();
const controller = require('../controllers/auditLog.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

router.get('/audit-logs', protect, requirePermission('VIEW_AUDIT_LOG'), controller.list);

module.exports = router;
