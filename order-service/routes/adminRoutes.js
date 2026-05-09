const express = require('express');
const router = express.Router();
const { getAllOrders } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.get('/orders', getAllOrders);

module.exports = router;
