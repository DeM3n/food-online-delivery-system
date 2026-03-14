const express = require('express');
const router = express.Router();
const { getRestaurants, getRestaurantById } = require('../controllers/restaurantController');

/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     tags:
 *       - Restaurants
 *     summary: List restaurants
 *     description: Returns restaurant list for public browsing.
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
 */
router.get('/', getRestaurants);

/**
 * @openapi
 * /api/restaurants/{id}:
 *   get:
 *     tags:
 *       - Restaurants
 *     summary: Get restaurant detail
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant detail retrieved successfully
 *       404:
 *         description: Restaurant not found
 */
router.get('/:id', getRestaurantById);

module.exports = router;
