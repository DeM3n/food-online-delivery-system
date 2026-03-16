const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  createVNPayPayment,
  vnpayReturn,
  vnpayIpn,
} = require('../controllers/paymentController');

// Create payment session for VNPay. Does NOT create order yet.
router.post('/create-vnpay', protect, createVNPayPayment);

// VNPay browser return
router.get('/vnpay/return', vnpayReturn);

// VNPay server callback (IPN)
router.get('/vnpay/ipn', vnpayIpn);

module.exports = router;
