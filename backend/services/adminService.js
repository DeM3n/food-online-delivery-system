const { User, Restaurant, Customer, DeliveryPartner, Order, sequelize } = require('../models');
const { Op } = require('sequelize');

class AdminService {
    async getSystemStats() {
        const [userCount, restaurantCount, driverCount, orderStats] = await Promise.all([
            User.count(),
            Restaurant.count(),
            DeliveryPartner.count(),
            Order.findAll({
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
                ]
            })
        ]);

        return {
            totalUsers: userCount,
            activeRestaurants: restaurantCount,
            deliveryPartners: driverCount,
            totalRevenue: orderStats[0]?.dataValues.totalRevenue || 0,
            totalOrders: orderStats[0]?.dataValues.totalOrders || 0
        };
    }

    async getAllUsers() {
        return await User.findAll({
            attributes: ['id', 'email', 'full_name', 'phone_number', 'role', 'created_at'],
            order: [['created_at', 'DESC']]
        });
    }

    async getAllOrders(restaurantId, statusFilter) {
        const where = {};
        if (restaurantId) {
            where.restaurant_id = restaurantId;
        }
        
        if (statusFilter && statusFilter !== 'all') {
            if (statusFilter === 'delivered') {
                where.status = { [Op.in]: ['delivered', 'completed'] };
            } else {
                where.status = statusFilter;
            }
        }

        const orders = await Order.findAll({
            where,
            include: [
                { model: Restaurant, attributes: ['name'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name'] }] }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get counts for each status
        const countWhere = {};
        if (restaurantId) countWhere.restaurant_id = restaurantId;

        const statusCounts = await Order.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            where: countWhere,
            group: ['status'],
            raw: true
        });

        const counts = {
            pending: 0,
            accepted: 0,
            preparing: 0,
            picked_up: 0,
            delivered: 0,
            cancelled: 0
        };

        statusCounts.forEach(sc => {
            if (sc.status === 'completed') {
                counts.delivered += parseInt(sc.count);
            } else if (counts.hasOwnProperty(sc.status)) {
                counts[sc.status] += parseInt(sc.count);
            }
        });

        return { orders, counts };
    }
}

module.exports = new AdminService();
