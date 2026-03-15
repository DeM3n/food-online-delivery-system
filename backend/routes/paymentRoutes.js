const express = require('express');
const router = express.Router();
const { vnpayReturn, vnpayIpn } = require('../controllers/paymentController');


router.get('/vnpay/return', vnpayReturn);
router.get('/vnpay/ipn', vnpayIpn);

module.exports = router;