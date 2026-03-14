const express = require('express');
const router = express.Router();
const { getCategories, getMenuItems, getFullMenu, getGlobalCategories } = require('../controllers/menuController');

/**
 * @openapi
 * /api/menu/global-categories:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get global categories
 *     description: Returns global/shared menu category data.
 *     responses:
 *       200:
 *         description: Global categories retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/global-categories', getGlobalCategories);

/**
 * @openapi
 * /api/menu/categories/{restaurantId}:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get restaurant categories
 *     description: Returns menu categories for a specific restaurant.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restaurant categories retrieved successfully
 *       404:
 *         description: Restaurant not found
 */
router.get('/categories/:restaurantId', getCategories);

/**
 * @openapi
 * /api/menu/items/{categoryId}:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get menu items by category
 *     description: Returns menu items under a specific category.
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Menu items retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/items/:categoryId', getMenuItems);

/**
 * @openapi
 * /api/menu/full/{restaurantId}:
 *   get:
 *     tags:
 *       - Menu
 *     summary: Get full restaurant menu
 *     description: Returns the full menu structure of a restaurant, including categories and items.
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Full menu retrieved successfully
 *       404:
 *         description: Restaurant not found
 */
router.get('/full/:restaurantId', getFullMenu);

module.exports = router;
