const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/productsController');

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product catalog
 *     description: Returns visible and available products with pagination, filtering, and sorting.
 *     parameters:
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurant_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 12
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, price, latest]
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       404:
 *         description: Product not found or not visible
 *       500:
 *         description: Product retrieval error
 */
router.get('/', getProducts);

module.exports = router;
