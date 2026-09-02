const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

exports.createOrder = catchAsync(async (req, res) => {
  const result = await paymentService.createPaymentOrder(req.user.id, req.body.eventSlug);
  res.status(201).json({ success: true, message: 'Order created.', data: result });
});

exports.verify = catchAsync(async (req, res) => {
  const result = await paymentService.verifyAndConfirmPayment(req.user.id, req.body);
  res.status(200).json({ success: true, message: 'Payment verified and registration confirmed.', data: result });
});
