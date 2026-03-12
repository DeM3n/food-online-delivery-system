const { MenuCategory, MenuItem, sequelize } = require('../models');

// @desc    Get categories for a restaurant
// @route   GET /api/menu/categories/:restaurantId
// @access  Public
exports.getCategories = async (req, res) => {
    try {
        const categories = await MenuCategory.findAll({
            where: { restaurant_id: req.params.restaurantId }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get menu items for a category
// @route   GET /api/menu/items/:categoryId
// @access  Public
exports.getMenuItems = async (req, res) => {
    try {
        const items = await MenuItem.findAll({
            where: { category_id: req.params.categoryId, is_available: true }
        });
        res.json({ success: true, data: items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get full menu for a restaurant (including categories and their items)
// @route   GET /api/menu/full/:restaurantId
// @access  Public
exports.getFullMenu = async (req, res) => {
    try {
        const menu = await MenuCategory.findAll({
            where: { restaurant_id: req.params.restaurantId },
            include: [{ model: MenuItem, where: { is_available: true }, required: false }]
        });
        res.json({ success: true, data: menu });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all unique category names (for dashboard filter)
// @route   GET /api/menu/global-categories
// @access  Public
exports.getGlobalCategories = async (req, res) => {
    try {
        const categories = await MenuCategory.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('name')), 'name']]
        });
        res.json({ success: true, data: categories.map(c => c.name) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
