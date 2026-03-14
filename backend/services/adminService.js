const { User, Restaurant, DeliveryPartner, Order, sequelize } = require('../models');

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
}

module.exports = new AdminService();
