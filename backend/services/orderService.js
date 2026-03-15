const { Order, Customer, Restaurant, DeliveryPartner, User, OrderItem, Address, Notification, MenuItem, sequelize } = require('../models');
const { Op } = require('sequelize');
const paymentService = require('./paymentService');
const { Payment } = require('../models');
const { sendDeliveredOrderEmail } = require('./mailService');   

class OrderService {
    async getRestaurantOrders(userId, statusFilter) {
        const restaurant = await Restaurant.findOne({ where: { user_id: userId } });
        if (!restaurant) throw new Error('Restaurant not found for this user');

        const where = { restaurant_id: restaurant.id };
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
                    model: OrderItem,
                    include: [{ model: MenuItem }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get counts for each status
        const statusCounts = await Order.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            where: { restaurant_id: restaurant.id },
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

    async createOrder(userId, orderData, io, req) {
        const t = await sequelize.transaction();

        try {
            const {
                restaurant_id,
                items = [],
                delivery_fee,
                delivery_address_id,
                notes,
                payment_method,
                force_proceed = false
            } = orderData;

            if (!restaurant_id) {
                throw new Error('restaurant_id is required');
            }

            if (!Array.isArray(items) || items.length === 0) {
                throw new Error('Order items are required');
            }

            const customer = await Customer.findOne({ where: { user_id: userId } });
            if (!customer) throw new Error('Customer not found');

            const restaurant = await Restaurant.findByPk(restaurant_id);
            if (!restaurant) throw new Error('Restaurant not found');

            const address = await Address.findOne({
                where: {
                    id: delivery_address_id,
                    customer_id: customer.id
                }
            });
            if (!address) throw new Error('Delivery address not found');

            const itemIds = items.map(i => i.menu_item_id || i.id);

            const dbItems = await MenuItem.findAll({
                where: {
                    id: { [Op.in]: itemIds },
                    restaurant_id: restaurant_id
                }
            });

            const unavailableItems = dbItems.filter(i => !i.is_available);

            if (unavailableItems.length > 0 && !force_proceed) {
                const error = new Error('Some items in your cart are now Out of Order');
                error.type = 'AVAILABILITY_CONFLICT';
                error.unavailableItems = unavailableItems.map(i => ({
                    id: i.id,
                    name: i.name
                }));
                throw error;
            }

            const validItems = items.filter(cartItem => {
                const menuItemId = cartItem.menu_item_id || cartItem.id;
                const dbItem = dbItems.find(i => i.id === menuItemId);
                return dbItem && dbItem.is_available;
            });

            if (validItems.length === 0) {
                throw new Error('No available items to order');
            }

            let subtotal = 0;

            const finalOrderItems = validItems.map(cartItem => {
                const menuItemId = cartItem.menu_item_id || cartItem.id;
                const dbItem = dbItems.find(i => i.id === menuItemId);

                const qty = Number(cartItem.quantity || 0);
                if (!qty || qty <= 0) {
                    throw new Error(`Invalid quantity for item ${dbItem?.name || menuItemId}`);
                }

                const unitPrice = Number(dbItem.price);
                const itemSubtotal = unitPrice * qty;
                subtotal += itemSubtotal;

                return {
                    menu_item_id: dbItem.id,
                    menu_item_name: dbItem.name,
                    quantity: qty,
                    unit_price: unitPrice,
                    subtotal: itemSubtotal
                };
            });

            const deliveryFee = Number(delivery_fee || 0);
            const total_amount = subtotal + deliveryFee;

            const paymentMethod = String(payment_method || 'cod').toLowerCase();
            let paymentUrl = null;
            let txnRef = null;

            const order = await Order.create(
                {
                    customer_id: customer.id,
                    restaurant_id,
                    delivery_address_id,
                    notes,
                    subtotal,
                    delivery_fee: deliveryFee,
                    total_amount,
                    status: 'pending',
                    payment_status: 'pending',
                    payment_method: paymentMethod,
                },
                { transaction: t }
            );

            await OrderItem.bulkCreate(
                finalOrderItems.map(item => ({
                    order_id: order.id,
                    menu_item_id: item.menu_item_id,
                    menu_item_name: item.menu_item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.subtotal
                })),
                { transaction: t }
            );

            if (paymentMethod === 'vnpay') {
                txnRef = paymentService.generateTxnRef(order.id);

                await Payment.create(
                    {
                        order_id: order.id,
                        amount: total_amount,
                        currency: 'VND',
                        transaction_id: txnRef,
                        payment_gateway: 'vnpay',
                        payment_method: 'vnpay',
                        status: 'pending',
                    },
                    { transaction: t }
                );
            }

            await Notification.create(
                {
                    user_id: customer.user_id,
                    type: 'order_created',
                    title: 'Đặt hàng thành công',
                    message: `Đơn hàng ${order.id} đã được tạo thành công.`
                },
                { transaction: t }
            );

            await t.commit();

            if (paymentMethod === 'vnpay') {
                paymentUrl = await paymentService.buildCheckoutUrl({
                    orderId: order.id,
                    amount: total_amount,
                    txnRef,
                    ipAddr: paymentService.getClientIp(req),
                });
            }

            const fullOrder = await Order.findByPk(order.id, {
                include: [
                    { model: OrderItem, include: [{ model: MenuItem }] },
                    { model: Restaurant, attributes: ['id', 'name'] },
                    { model: Address, attributes: ['id', 'street', 'city'] }
                ]
            });

            return {
                order: fullOrder,
                requiresPayment: paymentMethod === 'vnpay',
                paymentUrl,
            };
        } catch (error) {
            if (t && !t.finished) {
                await t.rollback();
            }
            throw error;
        }
    }

    async updateStatus(orderId, status, user, io) {
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
            if (!['delivered', 'completed'].includes(status)) {
                throw new Error('Customers can only confirm delivery or complete the order');
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
            if (status !== 'delivered') {
                throw new Error('Drivers can only mark orders as delivered');
            }
        }

        const oldStatus = order.status;

        order.status = status;
        await order.save();

        const statusData = { orderId: order.id, status: order.status };

        if (order.Customer && io) {
            io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        }

        if (order.Restaurant && io) {
            io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        }

        if (status === 'preparing' && io) {
            io.to('available_deliveries').emit('AVAILABLE_DELIVERY', {
                orderId: order.id,
                restaurantName: order.Restaurant?.name || 'Restaurant'
            });
        }

        // Gửi mail khi vừa chuyển sang delivered
        if (oldStatus !== 'delivered' && status === 'delivered') {
            try {
                const customerEmail = order.Customer?.User?.email;
                const customerName = order.Customer?.User?.full_name;
                const restaurantName = order.Restaurant?.name;

                if (customerEmail) {
                    await sendDeliveredOrderEmail({
                        to: customerEmail,
                        customerName,
                        orderId: order.id,
                        restaurantName,
                    });
                }
            } catch (mailError) {
                console.error('Send delivered email failed:', mailError);
                // Không throw để tránh update status thành công nhưng fail vì lỗi mail
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
                { model: Restaurant, attributes: ['name', 'user_id'] },
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

        order.delivery_partner_id = driverId;
        order.status = 'picked_up';
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
                { model: Restaurant, attributes: ['name', 'user_id'] },
                { model: Address, attributes: ['street', 'city'] },
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
                { model: Restaurant, attributes: ['name', 'user_id'] },
                { model: Address, attributes: ['street', 'city'] }
            ],
            order: [['updated_at', 'DESC']]
        });
    }

    async cancelOrder(orderId, userId, io) {
        const order = await Order.findByPk(orderId, {
            include: [{ model: Restaurant }, { model: Customer }]
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

        order.status = 'cancelled';
        await order.save();

        if (io) {
            if (order.Customer) io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', { orderId: order.id, status: 'cancelled' });
            if (order.Restaurant) io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', { orderId: order.id, status: 'cancelled' });
        }

        return order;
    }
}

module.exports = new OrderService();
