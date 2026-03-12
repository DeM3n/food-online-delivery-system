const { User, Restaurant, DeliveryPartner, Order, sequelize } = require('../models');

exports.getSystemStats = async (req, res) => {
    try {
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

        res.json({
            success: true,
            data: {
                totalUsers: userCount,
                activeRestaurants: restaurantCount,
                deliveryPartners: driverCount,
                totalRevenue: orderStats[0]?.dataValues.totalRevenue || 0,
                totalOrders: orderStats[0]?.dataValues.totalOrders || 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
