const { Restaurant, User, MenuCategory, MenuItem } = require('../models');
const { Op } = require('sequelize');

class RestaurantService {
    async getAllRestaurants(query) {
        const { search, category } = query;
        let where = { is_open: true };
        let include = [{ model: User, attributes: ['email', 'is_active'] }];

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

    async getRestaurantById(id) {
        const restaurant = await Restaurant.findByPk(id);
        if (!restaurant) {
            throw new Error('Restaurant not found');
        }
        return restaurant;
    }
}

module.exports = new RestaurantService();
