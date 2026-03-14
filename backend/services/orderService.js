const { Order, Customer, Restaurant, DeliveryPartner, User, OrderItem, Address, Notification, MenuItem, sequelize } = require('../models');
const { Op } = require('sequelize');

class OrderService {
    async getRestaurantOrders(userId) {
        const restaurant = await Restaurant.findOne({ where: { user_id: userId } });
        if (!restaurant) throw new Error('Restaurant not found for this user');

        return await Order.findAll({
            where: { restaurant_id: restaurant.id },
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
    }

    async getUserOrders(userId) {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        return await Order.findAll({
            where: { customer_id: customer.id },
            include: [
                { model: Restaurant, attributes: ['name'] },
                { model: OrderItem, include: [{ model: MenuItem }] },
                { 
                    model: DeliveryPartner, 
                    include: [{ model: User, attributes: ['full_name', 'phone_number'] }] 
                }
            ],
            order: [['created_at', 'DESC']]
        });
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

    async createOrder(userId, orderData, io) {
        const t = await sequelize.transaction();
        try {
            const { restaurant_id, items, delivery_fee, delivery_address_id, address_details, notes, payment_method, force_proceed = false } = orderData;

            const customer = await Customer.findOne({ where: { user_id: userId } });
            if (!customer) throw new Error('Customer not found');

            // 1. Final Availability Validation
            const itemIds = items.map(i => i.id);
            const dbItems = await MenuItem.findAll({
                where: { id: { [Op.in]: itemIds } }
            });

            const unavailableItems = dbItems.filter(i => !i.is_available);
            
            if (unavailableItems.length > 0 && !force_proceed) {
                await t.rollback();
                const error = new Error('Some items in your cart are now Out of Order');
                error.type = 'AVAILABILITY_CONFLICT';
                error.unavailableItems = unavailableItems.map(i => ({ id: i.id, name: i.name }));
                throw error;
            }

            // Filter out items that are not in the DB or are unavailable if force_proceed is true
            const validItems = items.filter(cartItem => {
                const dbItem = dbItems.find(i => i.id === cartItem.id);
                return dbItem && dbItem.is_available;
            });

            if (validItems.length === 0) {
                throw new Error('No available items to order');
            }

            // Recalculate totals based on DB prices to prevent tampering
            let subtotal = 0;
            const finalOrderItems = validItems.map(cartItem => {
                const dbItem = dbItems.find(i => i.id === cartItem.id);
                const itemSubtotal = parseFloat(dbItem.price) * cartItem.quantity;
                subtotal += itemSubtotal;
                return {
                    menu_item_id: dbItem.id,
                    menu_item_name: dbItem.name,
                    quantity: cartItem.quantity,
                    unit_price: dbItem.price,
                    subtotal: itemSubtotal
                };
            });

            const total_amount = subtotal + parseFloat(delivery_fee);

            let final_address_id = delivery_address_id;
            if (address_details && !final_address_id) {
                const newAddress = await Address.create({
                    customer_id: customer.id,
                    street: address_details,
                    city: 'Food City',
                    is_default: false
                }, { transaction: t });
                final_address_id = newAddress.id;
            }

            const order = await Order.create({
                customer_id: customer.id,
                restaurant_id,
                delivery_address_id: final_address_id,
                subtotal,
                delivery_fee,
                total_amount,
                notes,
                status: 'pending',
                payment_status: 'pending',
                payment_method
            }, { transaction: t });

            const orderItemsToInsert = finalOrderItems.map(item => ({
                ...item,
                order_id: order.id
            }));

            await OrderItem.bulkCreate(orderItemsToInsert, { transaction: t });

            const restaurant = await Restaurant.findByPk(restaurant_id);
            if (restaurant) {
                await Notification.create({
                    user_id: restaurant.user_id,
                    type: 'order',
                    title: 'New Order Received',
                    message: `You have a new order (#${order.id.slice(0, 8)}) for ${total_amount.toLocaleString()}đ`,
                    is_read: false
                }, { transaction: t });
            }

            await t.commit();

            if (restaurant && io) {
                io.to(restaurant.user_id).emit('NEW_ORDER', {
                    orderId: order.id,
                    totalAmount: total_amount
                });
            }

            return order;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    async updateStatus(orderId, status, user, io) {
        const order = await Order.findByPk(orderId, {
            include: [{ model: Customer }, { model: Restaurant }]
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

        order.status = status;
        await order.save();

        const statusData = { orderId: order.id, status: order.status };
        if (order.Customer && io) io.to(order.Customer.user_id).emit('ORDER_STATUS_UPDATED', statusData);
        if (order.Restaurant && io) io.to(order.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', statusData);

        if (status === 'preparing' && io) {
            io.to('available_deliveries').emit('AVAILABLE_DELIVERY', {
                orderId: order.id,
                restaurantName: order.Restaurant?.name || 'Restaurant'
            });
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
