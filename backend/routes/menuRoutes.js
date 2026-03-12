const express = require('express');
const router = express.Router();
const { getCategories, getMenuItems, getFullMenu, getGlobalCategories } = require('../controllers/menuController');

router.get('/global-categories', getGlobalCategories);
router.get('/categories/:restaurantId', getCategories);
router.get('/items/:categoryId', getMenuItems);
router.get('/full/:restaurantId', getFullMenu);

module.exports = router;
