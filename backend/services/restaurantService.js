const { Restaurant, User, MenuCategory, MenuItem } = require('../models');
const { Op } = require('sequelize');

class RestaurantService {
    async getAllRestaurants(query) {
        const { search, category } = query;
        const where = {};
        let include = [{
            model: User,
            attributes: ['email', 'is_active'],
            where: { is_active: true },
            required: true
        }];

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { cuisine_type: { [Op.like]: `%${search}%` } }
            ];

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
                required: true 
            });
        }

        return await Restaurant.findAll({
            where,
            include
        });
    }

    async getRestaurantById(id, options = {}) {
        const { allowClosed = false } = options;
        const restaurant = await Restaurant.findByPk(id);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }

        if (!allowClosed && !restaurant.is_open) {
            const error = new Error('Restaurant is currently closed');
            error.type = 'RESTAURANT_CLOSED';
            throw error;
        }

        return restaurant;
    }
}

module.exports = new RestaurantService();
