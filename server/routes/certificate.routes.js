const router = require('express').Router();
const controller = require('../controllers/certificate.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');

// Public — no auth. Only exposes what verifyCertificate() decides to return.
router.get('/certificates/verify/:code', controller.verify);

// Student-facing
router.get('/certificates/me', protect, controller.myCertificates);
router.get('/certificates/:code/download', protect, controller.download);

// Staff — bulk-generate certificates for everyone marked ELIGIBLE at an event.
router.post(
  '/events/:eventId/certificates/generate',
  protect,
  requirePermission('GENERATE_CERTIFICATE'),
  controller.generateForEvent
);

module.exports = router;
