const router = require('express').Router();
const controller = require('../controllers/member.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { memberUploadFields, enforcePerFieldSize } = require('../middleware/upload.middleware');
const { addMemberSchema, updateMemberSchema } = require('../validators/member.validator');

// Public
router.get('/members/years', controller.years);
router.get('/members/year/:year', controller.byYear);
router.get('/members/:id/photo', controller.photo);
router.get('/members/:id/cv', protect, controller.downloadCv);

// Staff — MANAGE_MEMBERS (Technical Team / Super Admin only, per permission matrix)
router.post(
  '/members',
  protect,
  requirePermission('MANAGE_MEMBERS'),
  memberUploadFields,
  enforcePerFieldSize,
  validate(addMemberSchema),
  controller.add
);
router.put(
  '/members/:id',
  protect,
  requirePermission('MANAGE_MEMBERS'),
  memberUploadFields,
  enforcePerFieldSize,
  validate(updateMemberSchema),
  controller.update
);
router.delete('/members/:id', protect, requirePermission('MANAGE_MEMBERS'), controller.remove);

module.exports = router;
