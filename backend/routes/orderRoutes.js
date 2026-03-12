const express = require('express');
const router = express.Router();
const { getRestaurantOrders, updateOrderStatus, getUserOrders, getMonthlyFavorite, createOrder, getAvailableDeliveries, acceptDelivery, getDriverDeliveries, getDriverHistory } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrder);
router.get('/deliveries/available', getAvailableDeliveries);
router.get('/driver/:driverId', getDriverDeliveries);
router.get('/driver/:driverId/history', getDriverHistory);
router.put('/:id/accept-delivery', protect, acceptDelivery);
router.get('/restaurant/:restaurantId', getRestaurantOrders);
router.get('/user/:userId', getUserOrders);
router.get('/user/:userId/favorite', getMonthlyFavorite);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
