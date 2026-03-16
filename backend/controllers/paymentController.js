const paymentService = require('../services/paymentService');

exports.createVNPayPayment = async (req, res) => {
  try {
    const { restaurantId, addressId, notes, delivery_fee } = req.body;

    const result = await paymentService.createCheckoutSession({
      userId: req.user.id,
      restaurantId,
      addressId,
      notes,
      deliveryFee: delivery_fee,
      gatewayName: 'vnpay',
      ipAddr: paymentService.getClientIp(req),
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Create VNPay payment error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Create VNPay payment failed' });
  }
};

exports.vnpayReturn = async (req, res) => {
  try {
    const finalized = await paymentService.finalizeGatewayResult({
      gatewayName: 'vnpay',
      query: req.query,
      source: 'return',
      io: req.io,
    });

    return res.redirect(paymentService.buildFrontendReturnUrl(finalized));
  } catch (error) {
    console.error('VNPay return error:', error);
    return res.status(500).json({ success: false, message: 'VNPay return handling failed' });
  }
};

exports.vnpayIpn = async (req, res) => {
  try {
    const finalized = await paymentService.finalizeGatewayResult({
      gatewayName: 'vnpay',
      query: req.query,
      source: 'ipn',
      io: req.io,
    });

    if (!finalized.verified) {
      return res.status(200).json({ RspCode: finalized.responseCode || '97', Message: finalized.message || 'Invalid Checksum' });
    }

    if (!finalized.ok) {
      return res.status(200).json({ RspCode: finalized.responseCode || '99', Message: finalized.message || 'Unknown error' });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
  } catch (error) {
    console.error('VNPay IPN controller error:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};
