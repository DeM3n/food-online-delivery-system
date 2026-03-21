const { Order, Customer, Restaurant, DeliveryPartner, User, OrderItem, Address, Notification, MenuItem, MenuCategory, sequelize } = require('../models');
const { Op } = require('sequelize');
const paymentService = require('./paymentService');
const { Payment } = require('../models');
const { sendDeliveredOrderEmail } = require('./mailService');   
const {
    OrderStatusContext,
    assertRoleCanUpdateStatus,
} = require('../states/order/orderStatusState');

class OrderService {
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

    async getUserOrders(userId, { date, limit = 5, offset = 0 } = {}) {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        const where = { customer_id: customer.id };
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.created_at = { [Op.between]: [startOfDay, endOfDay] };
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: Restaurant, attributes: ['name'] },
                { model: OrderItem, include: [{ model: MenuItem }] },
                { 
                    model: DeliveryPartner, 
                    include: [{ model: User, attributes: ['full_name', 'phone_number'] }] 
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const confirmedCount = await Order.count({
            where: {
                customer_id: customer.id,
                status: { [Op.in]: ['delivered', 'completed'] }
            }
        });

        return { orders: rows, total: count, confirmedCount };
    }

    async getMonthlyFavorite(userId) {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const favoriteData = await Order.findAll({
            attributes: [
                'restaurant_id',
                [sequelize.fn('COUNT', sequelize.col('restaurant_id')), 'count']
            ],
            where: {
                customer_id: customer.id,
                created_at: { [Op.gte]: startOfMonth }
            },
            group: ['restaurant_id'],
            order: [[sequelize.fn('COUNT', sequelize.col('restaurant_id')), 'DESC']],
            raw: true
        });

        if (favoriteData && favoriteData.length > 0 && favoriteData[0].restaurant_id) {
            const data = favoriteData[0];
            const restaurant = await Restaurant.findByPk(data.restaurant_id);
            if (restaurant) {
                return { 
                    type: 'restaurant',
                    ...restaurant.toJSON(), 
                    count: data.count 
                };
            }
        }
        return null;
    }

    // Replace the existing createOrder method with this version.
    // Updated createOrder method using the Builder Pattern
    async createOrder(userId, orderData, io, req) {
        const StandardCheckoutBuilder = require('../builders/checkout/StandardCheckoutBuilder');
        const CheckoutDirector = require('../builders/checkout/CheckoutDirector');

        const builder = new StandardCheckoutBuilder(userId, orderData);
        const director = new CheckoutDirector(builder);
        
        // Use the director to construct the complex CheckoutRequest object
        const checkoutRequest = await director.constructRequest();

        // 1. Online payment path (VNPay)
        if (checkoutRequest.paymentMethod === 'vnpay') {
            const session = await paymentService.createCheckoutSession({
                userId,
                restaurantId: checkoutRequest.restaurantId,
                addressId: checkoutRequest.addressId,
                notes: checkoutRequest.notes,
                gatewayName: 'vnpay',
                ipAddr: paymentService.getClientIp(req),
            });

            return {
                order: null,
                requiresPayment: true,
                paymentUrl: session.paymentUrl,
                txnRef: session.txnRef,
                amount: session.amount,
            };
        }

        // 2. COD path: Proceed with database records creation
        const t = await sequelize.transaction();

        try {
            const order = await Order.create({
                customer_id: checkoutRequest.customerId,
                restaurant_id: checkoutRequest.restaurantId,
                delivery_address_id: checkoutRequest.addressId,
                notes: checkoutRequest.notes,
                subtotal: checkoutRequest.subtotal,
                delivery_fee: checkoutRequest.deliveryFee,
                total_amount: checkoutRequest.totalAmount,
                status: 'pending',
                payment_status: 'pending',
                payment_method: 'cod',
            }, { transaction: t });

            const finalOrderItems = checkoutRequest.finalOrderItems.map(item => ({
                order_id: order.id,
                menu_item_id: item.menu_item_id,
                menu_item_name: item.menu_item_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                subtotal: item.subtotal,
            }));

            await OrderItem.bulkCreate(finalOrderItems, { transaction: t });

            await Notification.create({
                user_id: userId,
                type: 'order',
                title: 'Đặt hàng thành công',
                message: `Đơn hàng ${order.id} đã được tạo thành công.`
            }, { transaction: t });

            await t.commit();

            const fullOrder = await Order.findByPk(order.id, {
                include: [
                    { model: OrderItem, include: [{ model: MenuItem }] },
                    { model: Restaurant, attributes: ['id', 'name'] },
                    { model: Address, attributes: ['id', 'street', 'city'] }
                ]
            });

            return {
                order: fullOrder,
                requiresPayment: false,
                paymentUrl: null,
            };
        } catch (error) {
            if (t && !t.finished) await t.rollback();
            throw error;
        }
    }
    
    

    async updateStatus(orderId, status, user, io) {
        const nextStatus = String(status || '').toLowerCase();
        const order = await Order.findByPk(orderId, {
            include: [
                {
                    model: Customer,
                    include: [{ model: User, attributes: ['email', 'full_name'] }]
                },
                { model: Restaurant, attributes: ['name', 'user_id'] }
            ]
        });

        if (!order) throw new Error('Order not found');

        if (user.role === 'customer') {
            const customer = await Customer.findOne({ where: { user_id: user.id } });
            if (!customer || order.customer_id !== customer.id) {
                throw new Error('Not authorized to update this order');
            }
        } else if (user.role === 'restaurant') {
            const restaurant = await Restaurant.findOne({ where: { user_id: user.id } });
            if (!restaurant || order.restaurant_id !== restaurant.id) {
                throw new Error('Not authorized for this restaurant');
            }
        } else if (user.role === 'delivery_partner') {
            const driver = await DeliveryPartner.findOne({ where: { user_id: user.id } });
            if (!driver || order.delivery_partner_id !== driver.id) {
                throw new Error('Not authorized to update this delivery');
            }
        } else {
            throw new Error('Not authorized to update this order');
        }

        const oldStatus = order.status;
        assertRoleCanUpdateStatus({ role: user.role, targetStatus: nextStatus });

        const stateContext = new OrderStatusContext(oldStatus);
        stateContext.transitionTo(nextStatus);

        order.status = stateContext.getCurrentStatus();

        // If order is COD and status is delivered or completed, mark as paid
        if ((order.status === 'delivered' || order.status === 'completed') && order.payment_method === 'cod') {
            order.payment_status = 'paid';
        }

        await order.save();

        const statusData = { orderId: order.id, status: order.status };

        if (order.Customer && io) {
            console.log(`📡 Socket.io: Emitting ORDER_STATUS_UPDATED to customer ${order.Customer.user_id}:`, statusData);
            io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        }
    
        if (order.Restaurant && io) {
            console.log(`📡 Socket.io: Emitting ORDER_STATUS_UPDATED to restaurant ${order.Restaurant.user_id}:`, statusData);
            io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        }

        if (order.status === 'preparing' && io) {
            io.to('available_deliveries').emit('AVAILABLE_DELIVERY', {
                orderId: order.id,
                restaurantName: order.Restaurant?.name || 'Restaurant'
            });
        }

        // Send delivered email in background so status update is not blocked by SMTP latency.
        if (oldStatus !== 'delivered' && order.status === 'delivered') {
            const customerEmail = order.Customer?.User?.email;
            const customerName = order.Customer?.User?.full_name;
            const restaurantName = order.Restaurant?.name;

            if (customerEmail) {
                sendDeliveredOrderEmail({
                    to: customerEmail,
                    customerName,
                    orderId: order.id,
                    restaurantName,
                }).catch((mailError) => {
                    console.error('Send delivered email failed:', mailError);
                });
            }
        }

        return order;
    }

    async getAvailableDeliveries() {
        return await Order.findAll({
            where: {
                status: 'preparing',
                delivery_partner_id: null
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id', 'location'] },
                { model: Address, attributes: ['street', 'city'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] }
            ],
            order: [['updated_at', 'ASC']]
        });
    }

    async acceptByDriver(orderId, driverId, io) {
        const order = await Order.findByPk(orderId, {
            include: [{ model: Customer }, { model: Restaurant }]
        });

        if (!order) throw new Error('Order not found');
        if (order.status !== 'preparing' || order.delivery_partner_id) {
            throw new Error('Order is no longer available');
        }

        const stateContext = new OrderStatusContext(order.status);
        stateContext.transitionTo('picked_up');

        order.delivery_partner_id = driverId;
        order.status = stateContext.getCurrentStatus();
        await order.save();

        const fullOrder = await Order.findByPk(order.id, {
            include: [
                { 
                    model: DeliveryPartner, 
                    include: [{ model: User, attributes: ['full_name', 'phone_number'] }] 
                }
            ]
        });

        const statusData = { 
            orderId: order.id, 
            status: order.status,
            deliveryPartner: fullOrder.DeliveryPartner
        };

        if (io) {
            io.to('available_deliveries').emit('ORDER_ACCEPTED', { orderId: order.id });
            if (order.Customer) io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', statusData);
            if (order.Restaurant) io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        }

        return order;
    }

    async getDriverDeliveries(userId) {
        const driver = await DeliveryPartner.findOne({ where: { user_id: userId } });
        if (!driver) throw new Error('Driver profile not found');

        return await Order.findAll({
            where: {
                delivery_partner_id: driver.id,
                status: 'picked_up'
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id', 'location'] },
                { model: Address, attributes: ['street', 'city', 'latitude', 'longitude'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] }
            ],
            order: [['updated_at', 'DESC']]
        });
    }

    async getDriverHistory(userId) {
        const driver = await DeliveryPartner.findOne({ where: { user_id: userId } });
        if (!driver) throw new Error('Driver profile not found');

        return await Order.findAll({
            where: {
                delivery_partner_id: driver.id,
                status: { [Op.in]: ['delivered', 'completed'] }
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id', 'location'] },
                { model: Address, attributes: ['street', 'city'] }
            ],
            order: [['updated_at', 'DESC']]
        });
    }

    async cancelOrder(orderId, userId, io, req = null) {
        const order = await Order.findByPk(orderId, {
            include: [
                { model: Restaurant },
                { model: Customer, include: [{ model: User, attributes: ['email', 'full_name'] }] }
            ]
        });

        if (!order) throw new Error('Order not found');

        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer || order.customer_id !== customer.id) {
            throw new Error('Not authorized to cancel this order');
        }

        const allowedStatuses = ['pending', 'accepted'];
        if (!allowedStatuses.includes(order.status)) {
            throw new Error(`Cannot cancel order in ${order.status} status.`);
        }

        let refund = {
            refunded: false,
            refundStatus: 'none',
            refundAmount: 0,
            refundMessage: 'No refund required',
        };

        try {
            refund = await paymentService.refundOrderPayment({
                order,
                ipAddr: req ? paymentService.getClientIp(req) : '127.0.0.1',
                createBy: 'customer_cancel',
            });
        } catch (refundError) {
            console.error('Refund processing failed:', refundError);
            refund = {
                refunded: false,
                refundStatus: 'failed',
                refundAmount: 0,
                refundMessage: refundError.message || 'Refund request failed',
            };
        }

        // Chỉ đổi sang refunded khi refund thành công thật
        if (refund.refundResponseCode === '99') {
            order.status = 'cancelled';
            order.payment_status = 'refunded';
        } else {
            order.status = 'cancelled';
            order.payment_status = 'cancelled';
        }

        await order.save();

        if (io) {
            if (order.Customer) {
                io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', {
                    orderId: order.id,
                    status: order.status,
                    refund,
                });
            }

            if (order.Restaurant) {
                io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', {
                    orderId: order.id,
                    status: order.status,
                    refund,
                });
            }
        }

        return {
            order,
            refund,
        };
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

module.exports = new OrderService();
