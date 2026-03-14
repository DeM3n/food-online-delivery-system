const express = require('express');
const router = express.Router();
const { 
    getCategories, 
    getMenuItems, 
    getFullMenu, 
    getGlobalCategories,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability
} = require('../controllers/menuController');
const { protect } = require('../middleware/authMiddleware');

router.get('/global-categories', getGlobalCategories);
router.get('/categories/:restaurantId', getCategories);
router.get('/', getMenuItems);
router.get('/items/:categoryId', getMenuItems); // Legacy support
router.get('/full/:restaurantId', getFullMenu);

// Restaurant specific management
router.post('/', protect, createMenuItem);
router.put('/:id', protect, updateMenuItem);
router.patch('/:id/toggle-availability', protect, toggleAvailability);
router.delete('/:id', protect, deleteMenuItem);

module.exports = router;
