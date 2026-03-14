const express = require('express');
const router = express.Router();
const { getContents, getContentDetail } = require('../controllers/contentsController');

/**
 * @openapi
 * /api/contents:
 *   get:
 *     tags:
 *       - Contents
 *     summary: List published contents
 *     description: Returns published and visible news/articles with pagination and optional search.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: content_type
 *         schema:
 *           type: string
 *           example: article
 *     responses:
 *       200:
 *         description: Published contents retrieved successfully
 *       500:
 *         description: Content list retrieval error
 */
router.get('/', getContents);

/**
 * @openapi
 * /api/contents/{id}:
 *   get:
 *     tags:
 *       - Contents
 *     summary: Get content detail
 *     description: Returns the detail of a published and visible content item by id.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content detail retrieved successfully
 *       400:
 *         description: Invalid content id
 *       404:
 *         description: Content not found or not visible
 *       500:
 *         description: Content detail retrieval error
 */
router.get('/:id', getContentDetail);

module.exports = router;
