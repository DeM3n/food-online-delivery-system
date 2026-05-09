const restaurantService = require('../services/restaurantService');
const { Restaurant } = require('../models');

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

// @desc    Get restaurant profile by user ID
// @route   GET /api/restaurants/my-profile
// @access  Private
exports.getMyRestaurantProfile = async (req, res) => {
    try {
        const restaurant = await restaurantService.getRestaurantByUserId(req.user.id);
        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.error(error);
        res.status(404).json({ success: false, message: error.message });
    }
};

// @desc    Update restaurant profile by user ID
// @route   PUT /api/restaurants/my-profile
// @access  Private
exports.updateMyRestaurantProfile = async (req, res) => {
    try {
        const restaurant = await restaurantService.getRestaurantByUserId(req.user.id);
        const { is_open, name, location, cuisine_type } = req.body;
        
        if (name) restaurant.name = name;
        if (location) restaurant.location = location;
        if (cuisine_type) restaurant.cuisine_type = cuisine_type;
        if (typeof is_open === 'boolean') restaurant.is_open = is_open;
        
        await restaurant.save();
        
        // Note: In a complete microservices architecture, you might emit a message here
        // to notify other services of the status change.

        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Create restaurant profile
// @route   POST /api/restaurants
// @access  Private
exports.createRestaurantProfile = async (req, res) => {
    try {
        const { name, location, cuisine_type } = req.body;
        
        // Check if profile already exists
        const existing = await Restaurant.findOne({ where: { user_id: req.user.id } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Restaurant profile already exists' });
        }

        const restaurant = await restaurantService.createRestaurant({
            user_id: req.user.id,
            name: name || 'New Restaurant',
            location,
            cuisine_type,
            is_open: true
        });

        res.status(201).json({ success: true, data: restaurant });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};
