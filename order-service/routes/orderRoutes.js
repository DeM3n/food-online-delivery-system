const express = require('express');
const router = express.Router();
const { getRestaurantOrders, updateOrderStatus, getUserOrders, getMonthlyFavorite, createOrder, getAvailableDeliveries, acceptDelivery, getDriverDeliveries, getDriverHistory, cancelOrder, getRestaurantYearlySummary } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrder);
router.get('/deliveries/available', protect, getAvailableDeliveries);
router.get('/driver/me', protect, getDriverDeliveries);
router.get('/driver/me/history', protect, getDriverHistory);
router.put('/:id/accept-delivery', protect, acceptDelivery);
router.get('/restaurant/me/yearly-summary', protect, getRestaurantYearlySummary);
router.get('/restaurant/me', protect, getRestaurantOrders);
router.get('/me', protect, getUserOrders);
router.get('/me/favorite', protect, getMonthlyFavorite);
router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
