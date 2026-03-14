const express = require('express');
const router = express.Router();
const { getRestaurantOrders, updateOrderStatus, getUserOrders, getMonthlyFavorite, createOrder, getAvailableDeliveries, acceptDelivery, getDriverDeliveries, getDriverHistory } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create order
 *     security:
 *       - bearerAuth: []
 *     description: Creates a new order for the authenticated user.
 *     responses:
 *       200:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', protect, createOrder);

/**
 * @openapi
 * /api/orders/deliveries/available:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get available deliveries
 *     description: Returns deliveries currently available for drivers.
 *     responses:
 *       200:
 *         description: Available deliveries retrieved successfully
 */
router.get('/deliveries/available', getAvailableDeliveries);

/**
 * @openapi
 * /api/orders/driver/{driverId}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get active deliveries for driver
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver deliveries retrieved successfully
 */
router.get('/driver/:driverId', getDriverDeliveries);

/**
 * @openapi
 * /api/orders/driver/{driverId}/history:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get delivery history for driver
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver delivery history retrieved successfully
 */
router.get('/driver/:driverId/history', getDriverHistory);

/**
 * @openapi
 * /api/orders/{id}/accept-delivery:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Accept delivery
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delivery accepted successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/:id/accept-delivery', protect, acceptDelivery);

/**
 * @openapi
 * /api/orders/restaurant/{restaurantId}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get orders for restaurant
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant orders retrieved successfully
 */
router.get('/restaurant/:restaurantId', getRestaurantOrders);

/**
 * @openapi
 * /api/orders/user/{userId}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get orders for user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User orders retrieved successfully
 */
router.get('/user/:userId', getUserOrders);

/**
 * @openapi
 * /api/orders/user/{userId}/favorite:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Get monthly favorite for user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monthly favorite retrieved successfully
 */
router.get('/user/:userId/favorite', getMonthlyFavorite);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   put:
 *     tags:
 *       - Orders
 *     summary: Update order status
 *     description: Updates the status of an order.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       404:
 *         description: Order not found
 */
router.put('/:id/status', updateOrderStatus);

module.exports = router;
