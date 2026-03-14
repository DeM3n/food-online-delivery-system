const express = require('express');
const router = express.Router();
const { getHomeSummary } = require('../controllers/homeController');

/**
 * @openapi
 * /api/home/summary:
 *   get:
 *     tags:
 *       - Home
 *     summary: Get homepage summary
 *     description: Returns featured categories, featured products, and latest news/articles for homepage rendering.
 *     responses:
 *       200:
 *         description: Homepage summary retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/summary', getHomeSummary);

module.exports = router;
