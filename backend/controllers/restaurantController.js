const restaurantService = require('../services/restaurantService');

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getRestaurants = async (req, res) => {
    try {
        const restaurants = await restaurantService.getAllRestaurants(req.query);
        res.json({ success: true, data: restaurants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
exports.getRestaurantById = async (req, res) => {
    try {
        const restaurant = await restaurantService.getRestaurantById(req.params.id);
        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.error(error);
        const statusCode =
            error.message === 'Restaurant not found' ? 404 :
            error.type === 'RESTAURANT_CLOSED' ? 403 :
            500;
        res.status(statusCode).json({ success: false, message: error.message, type: error.type });
    }
};
