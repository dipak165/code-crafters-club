const router = require('express').Router();
const controller = require('../controllers/leaderboard.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/rbac.middleware');
const { updateRuleSchema, awardPointsSchema } = require('../validators/leaderboard.validator');

// Public
router.get('/leaderboard/top', controller.top);
router.get('/leaderboard/rules', controller.rules);

// Student-facing
router.get('/leaderboard/me', protect, controller.mine);

// Staff — MANAGE_LEADERBOARD
router.put('/leaderboard/rules/:action', protect, requirePermission('MANAGE_LEADERBOARD'), validate(updateRuleSchema), controller.updateRule);
router.post('/leaderboard/award', protect, requirePermission('MANAGE_LEADERBOARD'), validate(awardPointsSchema), controller.award);

module.exports = router;
