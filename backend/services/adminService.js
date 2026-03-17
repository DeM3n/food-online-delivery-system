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
            attributes: ['id', 'email', 'full_name', 'phone_number', 'role', 'is_active', 'created_at'],
            order: [['created_at', 'DESC']]
        });
    }

    async updateUserStatus(userId, isActive, currentAdminId) {
        if (typeof isActive !== 'boolean') {
            throw new Error('is_active is required and must be boolean');
        }

        if (userId === currentAdminId && !isActive) {
            throw new Error('Cannot deactivate your own admin account');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.is_active = isActive;
        await user.save();

        return {
            id: user.id,
            is_active: user.is_active
        };
    }

    async getAllOrders(restaurantId, statusFilter, page = 1, limit = 20) {
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

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
        const offset = (parsedPage - 1) * parsedLimit;

        const { count: total, rows: orders } = await Order.findAndCountAll({
            where,
            include: [
                { model: Restaurant, attributes: ['name'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name'] }] }
            ],
            limit: parsedLimit,
            offset,
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
            cancelled: 0,
            refunded: 0
        };

        statusCounts.forEach(sc => {
            if (sc.status === 'completed') {
                counts.delivered += parseInt(sc.count);
            } else if (counts.hasOwnProperty(sc.status)) {
                counts[sc.status] += parseInt(sc.count);
            }
        });

        return {
            orders,
            counts,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                totalPages: Math.max(Math.ceil(total / parsedLimit), 1)
            }
        };
    }
}

module.exports = new AdminService();
