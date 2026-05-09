const { Restaurant } = require('../models');
const { Op } = require('sequelize');

class RestaurantService {
    async getAllRestaurants(query) {
        const { search, category } = query;
        const where = {};
        let include = [];

        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { cuisine_type: { [Op.like]: `%${search}%` } }
            ];
            // Simplifying the search compared to the monolith for now
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

    async getRestaurantByUserId(userId) {
        const restaurant = await Restaurant.findOne({ where: { user_id: userId } });
        if (!restaurant) {
            throw new Error('Restaurant profile not found');
        }
        return restaurant;
    }

    async createRestaurant(restaurantData) {
        return await Restaurant.create(restaurantData);
    }
}

module.exports = new RestaurantService();
