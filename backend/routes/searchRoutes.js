const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController');
const { getSearchSuggestions } = require('../controllers/searchSuggestionsController');

/**
 * @openapi
 * /api/search/suggestions:
 *   get:
 *     tags:
 *       - Search
 *     summary: Get search suggestions
 *     description: Returns lightweight typeahead suggestions from products and contents.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Suggestions retrieved successfully
 *       500:
 *         description: Suggestions retrieval error
 */
router.get('/suggestions', getSearchSuggestions);

/**
 * @openapi
 * /api/search:
 *   get:
 *     tags:
 *       - Search
 *     summary: Unified search
 *     description: Searches products and contents by keyword.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: product_limit
 *         schema:
 *           type: integer
 *           example: 8
 *       - in: query
 *         name: content_limit
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search query
 *       500:
 *         description: Search service error
 */
router.get('/', searchAll);

module.exports = router;
