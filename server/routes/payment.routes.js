const router = require('express').Router();
const controller = require('../controllers/payment.controller');
const validate = require('../middleware/validate.middleware');
const { protect, requireVerifiedEmail } = require('../middleware/auth.middleware');
const { createOrderSchema, verifyPaymentSchema } = require('../validators/payment.validator');

router.post('/create-order', protect, requireVerifiedEmail, validate(createOrderSchema), controller.createOrder);
router.post('/verify', protect, validate(verifyPaymentSchema), controller.verify);

module.exports = router;
