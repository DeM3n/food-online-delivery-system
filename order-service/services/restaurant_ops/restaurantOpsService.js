const { Order, Customer, Restaurant, DeliveryPartner, User, OrderItem, MenuItem, MenuCategory, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Interface: IRestaurantOpsAPI
 */
class RestaurantOpsService {
    async getRestaurantOrders(userId, statusFilter, date) {
        const restaurant = await Restaurant.findOne({ where: { user_id: userId } });
        if (!restaurant) throw new Error('Restaurant not found for this user');

        const where = { restaurant_id: restaurant.id };
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.created_at = { [Op.between]: [startOfDay, endOfDay] };
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
                {
                    model: Customer,
                    include: [{ model: User, attributes: ['email', 'full_name', 'phone_number'] }]
                },
                {
                    model: DeliveryPartner,
                    include: [{ model: User, attributes: ['full_name', 'phone_number'] }]
                },
                {
                    model: OrderItem,
                    include: [{ model: MenuItem }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get counts for each status
        const statusCounts = await Order.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            where: {
                restaurant_id: restaurant.id,
                ...(date && { created_at: where.created_at })
            },
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

        return { orders, counts };
    }

    async getRestaurantYearlySummary(userId, year) {
        const restaurant = await Restaurant.findOne({ where: { user_id: userId } });
        if (!restaurant) throw new Error('Restaurant not found for this user');

        const targetYear = parseInt(year) || new Date().getFullYear();
        const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

        // All delivered/completed orders for the target year
        const deliveredOrders = await Order.findAll({
            where: {
                restaurant_id: restaurant.id,
                status: { [Op.in]: ['delivered', 'completed'] },
                created_at: { [Op.between]: [startOfYear, endOfYear] }
            },
            include: [
                {
                    model: OrderItem,
                    include: [{ model: MenuItem, include: [{ model: MenuCategory }] }]
                }
            ]
        });

        // Monthly revenue (12 months)
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthlyRevenue = MONTHS.map(month => ({ month, revenue: 0 }));
        deliveredOrders.forEach(order => {
            const m = new Date(order.created_at).getMonth();
            const subtotal = Number(order.subtotal) || Math.max(Number(order.total_amount || 0) - Number(order.delivery_fee || 0), 0);
            monthlyRevenue[m].revenue += subtotal;
        });

        const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
        const totalOrders = deliveredOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Top 5 best-selling dishes by quantity
        const dishMap = {};
        deliveredOrders.forEach(order => {
            (order.OrderItems || []).forEach(item => {
                const id = item.menu_item_id;
                if (!dishMap[id]) dishMap[id] = { name: item.menu_item_name, quantity: 0, revenue: 0 };
                dishMap[id].quantity += Number(item.quantity);
                dishMap[id].revenue += Number(item.subtotal || 0);
            });
        });
        const topDishes = Object.values(dishMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Category distribution by quantity sold
        const catMap = {};
        deliveredOrders.forEach(order => {
            (order.OrderItems || []).forEach(item => {
                const catName = item.MenuItem?.MenuCategory?.name || 'Other';
                if (!catMap[catName]) catMap[catName] = 0;
                catMap[catName] += Number(item.quantity);
            });
        });
        const categoryDistribution = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // All recent orders across all statuses for the selected year
        const recentOrders = await Order.findAll({
            where: {
                restaurant_id: restaurant.id,
                created_at: { [Op.between]: [startOfYear, endOfYear] }
            },
            include: [
                { model: Customer, include: [{ model: User, attributes: ['full_name'] }] }
            ],
            order: [['created_at', 'DESC']]
        });

        return {
            stats: { totalRevenue, totalOrders, avgOrderValue },
            monthlyRevenue,
            topDishes,
            categoryDistribution,
            recentOrders: recentOrders.map(o => ({
                id: o.id,
                customerName: o.Customer?.User?.full_name || 'Unknown',
                subtotal: Number(o.subtotal) || Math.max(Number(o.total_amount || 0) - Number(o.delivery_fee || 0), 0),
                createdAt: o.created_at,
                status: o.status
            }))
        };
    }
}

module.exports = new RestaurantOpsService();
