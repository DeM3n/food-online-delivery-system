const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/categoriesController');

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: List categories
 *     description: Returns categories and supports basic browsing/filtering by restaurant, category, keyword, and item inclusion.
 *     parameters:
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
 *         name: include_items
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', getCategories);

module.exports = router;
