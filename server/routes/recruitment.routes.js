const router = require('express').Router();
const controller = require('../controllers/recruitment.controller');
const validate = require('../middleware/validate.middleware');
const { protect, attachUserIfPresent } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { resumeUpload } = require('../middleware/upload.middleware');
const { publicFormLimiter } = require('../middleware/rateLimiter.middleware');
const { applySchema, updateStatusSchema } = require('../validators/recruitment.validator');

// Public — anyone can apply, logged in or not. If a valid token is
// present, the application is linked to that account; otherwise it's
// still accepted (spec section 47 doesn't require an account first).
// Rate-limited since this is an unauthenticated write endpoint.
router.post('/recruitment', publicFormLimiter, attachUserIfPresent, resumeUpload, validate(applySchema), controller.apply);

// Resume access: staff OR the applicant's own account — enforced in
// the service, so this route only requires being logged in at all,
// not the MANAGE_RECRUITMENT permission specifically.
router.get('/recruitment/:id/resume', protect, controller.downloadResume);

// Staff — MANAGE_RECRUITMENT (Technical Team / Super Admin per permission matrix)
router.get('/recruitment', protect, requirePermission('MANAGE_RECRUITMENT'), controller.listAll);
router.get('/recruitment/:id', protect, requirePermission('MANAGE_RECRUITMENT'), controller.getById);
router.put('/recruitment/:id/status', protect, requirePermission('MANAGE_RECRUITMENT'), validate(updateStatusSchema), controller.updateStatus);

module.exports = router;
