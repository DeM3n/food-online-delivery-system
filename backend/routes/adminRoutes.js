const express = require('express');
const router = express.Router();
const { getSystemStats, getAllUsers, getAllOrders } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.get('/orders', getAllOrders);

module.exports = router;
