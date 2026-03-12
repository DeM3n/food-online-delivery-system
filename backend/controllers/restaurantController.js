const { Restaurant, User, MenuCategory, MenuItem } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
exports.getRestaurants = async (req, res) => {
    try {
        const { search, category } = req.query;
        let where = { is_open: true };
        let include = [{ model: User, attributes: ['email', 'is_active'] }];

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { cuisine_type: { [Op.like]: `%${search}%` } }
            ];

            // Also search in menu items and include those restaurants
            const matchingItems = await MenuItem.findAll({
                where: {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { description: { [Op.like]: `%${search}%` } }
                    ]
                },
                attributes: ['restaurant_id']
            });

            if (matchingItems.length > 0) {
                const restaurantIds = matchingItems.map(item => item.restaurant_id);
                where[Op.or].push({ id: { [Op.in]: restaurantIds } });
            }
        }

        if (category) {
            include.push({
                model: MenuCategory,
                where: { name: category },
                required: true // This effectively filters restaurants by category
            });
        }

        const restaurants = await Restaurant.findAll({
            where,
            include
        });
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
        const restaurant = await Restaurant.findByPk(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.json({ success: true, data: restaurant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
