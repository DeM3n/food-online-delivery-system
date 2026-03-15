const paymentService = require('../services/paymentService');

// @desc    VNPay return URL
// @route   GET /api/payments/vnpay/return
// @access  Public
exports.vnpayReturn = async (req, res) => {
  try {
    const redirectUrl = paymentService.buildFrontendReturnUrl(req.query);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('VNPay return error:', error);
    return res.status(500).json({
      success: false,
      message: 'VNPay return handling failed',
    });
  }
};

// @desc    VNPay IPN callback
// @route   GET /api/payments/vnpay/ipn
// @access  Public
exports.vnpayIpn = async (req, res) => {
  try {
    const result = await paymentService.processVnpayIpn(req.query, req.io);
    return res.status(200).json(result);
  } catch (error) {
    console.error('VNPay IPN controller error:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};