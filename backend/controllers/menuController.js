const menuService = require('../services/menuService');

// @desc    Get categories for a restaurant
// @route   GET /api/menu/categories/:restaurantId
exports.getCategories = async (req, res) => {
    try {
        const categories = await menuService.getCategories(req.params.restaurantId);
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get menu items with pagination and filters
// @route   GET /api/menu
exports.getMenuItems = async (req, res) => {
    try {
        const { restaurantId, categoryId, page, limit, search } = req.query;
        const result = await menuService.getMenuItems({ restaurantId, categoryId, page, limit, search });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get full menu for a restaurant
// @route   GET /api/menu/full/:restaurantId
exports.getFullMenu = async (req, res) => {
    try {
        const menu = await menuService.getFullMenu(req.params.restaurantId);
        res.json({ success: true, data: menu });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create menu item
// @route   POST /api/menu
exports.createMenuItem = async (req, res) => {
    try {
        const item = await menuService.createMenuItem(req.user.id, req.body);
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update menu item
// @route   PUT /api/menu/:id
exports.updateMenuItem = async (req, res) => {
    try {
        const item = await menuService.updateMenuItem(req.params.id, req.user.id, req.body);
        res.json({ success: true, data: item });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Toggle menu item availability
// @route   PATCH /api/menu/:id/toggle-availability
exports.toggleAvailability = async (req, res) => {
    try {
        const item = await menuService.toggleAvailability(req.params.id, req.user.id, req.io);
        res.json({ success: true, data: item });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
exports.deleteMenuItem = async (req, res) => {
    try {
        await menuService.deleteMenuItem(req.params.id, req.user.id);
        res.json({ success: true, message: 'Item deleted' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Get all unique category names
// @route   GET /api/menu/global-categories
exports.getGlobalCategories = async (req, res) => {
    try {
        const categories = await menuService.getGlobalCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
