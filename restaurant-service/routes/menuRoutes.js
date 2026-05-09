const express = require('express');
const {
    getCategories,
    getMenuItems,
    getFullMenu,
    createMenuItem,
    updateMenuItem,
    toggleAvailability,
    deleteMenuItem,
    getGlobalCategories
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getMenuItems);
router.get('/global-categories', getGlobalCategories);
router.get('/categories/:restaurantId', getCategories);
router.get('/full/:restaurantId', getFullMenu);

// Protected routes (Restaurant owner only)
router.post('/', protect, authorize('restaurant'), createMenuItem);
router.put('/:id', protect, authorize('restaurant'), updateMenuItem);
router.patch('/:id/toggle-availability', protect, authorize('restaurant'), toggleAvailability);
router.delete('/:id', protect, authorize('restaurant'), deleteMenuItem);

module.exports = router;
