const { Order, Customer, Restaurant, DeliveryPartner, User, OrderItem, Address, Notification, MenuItem, MenuCategory, sequelize } = require('../../models');
const { Op } = require('sequelize');
const paymentService = require('../paymentService');
const notificationProxy = require('../NotificationProxy');
const {
    OrderStatusContext,
    assertRoleCanUpdateStatus,
} = require('../../states/order/orderStatusState');
module.exports = require('../orderService');


/**
 * Interface: IOrderFulfillmentAPI
 */
class FulfillmentService {
    // ... (getUserOrders and getMonthlyFavorite remain same)
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
        const StandardCheckoutBuilder = require('../../builders/checkout/StandardCheckoutBuilder');
        const CheckoutDirector = require('../../builders/checkout/CheckoutDirector');

        const builder = new StandardCheckoutBuilder(userId, orderData);
        const director = new CheckoutDirector(builder);
        
        const checkoutRequest = await director.constructRequest();

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
                    { model: Restaurant, attributes: ['id', 'name', 'user_id'] },
                    { model: Address, attributes: ['id', 'street', 'city'] }
                ]
            });

            // Notify NEW_ORDER via Proxy
            if (fullOrder.Restaurant) {
                notificationProxy.emitRealtime(fullOrder.Restaurant.user_id, 'NEW_ORDER', {
                    orderId: fullOrder.id,
                    status: fullOrder.status,
                    total_amount: fullOrder.total_amount
                });
            }

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

        if ((order.status === 'delivered' || order.status === 'completed') && order.payment_method === 'cod') {
            order.payment_status = 'paid';
        }

        await order.save();

        const statusData = { orderId: order.id, status: order.status };

        if (order.Customer) {
            notificationProxy.emitRealtime(order.Customer.user_id, 'ORDER_STATUS_UPDATED', statusData);
        }
    
        if (order.Restaurant) {
            notificationProxy.emitRealtime(order.Restaurant.user_id, 'ORDER_STATUS_UPDATED', statusData);
        }

        if (order.status === 'preparing') {
            notificationProxy.emitRealtime('available_deliveries', 'AVAILABLE_DELIVERY', {
                orderId: order.id,
                restaurantName: order.Restaurant?.name || 'Restaurant'
            });
        }

        if (oldStatus !== 'delivered' && order.status === 'delivered') {
            const customerEmail = order.Customer?.User?.email;
            const customerName = order.Customer?.User?.full_name;
            const restaurantName = order.Restaurant?.name;

            if (customerEmail) {
                notificationProxy.sendEmail('delivered', {
                    to: customerEmail,
                    customerName,
                    orderId: order.id,
                    restaurantName,
                });
            }
        }

        return order;
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

        const stateContext = new OrderStatusContext(order.status);
        stateContext.transitionTo('cancelled');

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

        if (refund.refundResponseCode === '99') {
            order.status = stateContext.getCurrentStatus();
            order.payment_status = 'refunded';
        } else {
            order.status = stateContext.getCurrentStatus();
            order.payment_status = 'cancelled';
        }

        await order.save();

        if (order.Customer) {
            notificationProxy.emitRealtime(order.Customer.user_id, 'ORDER_STATUS_UPDATED', {
                orderId: order.id,
                status: order.status,
                refund,
            });
        }

        if (order.Restaurant) {
            notificationProxy.emitRealtime(order.Restaurant.user_id, 'ORDER_STATUS_UPDATED', {
                orderId: order.id,
                status: order.status,
                refund,
            });
        }

        return { order, refund };
    }
}

module.exports = new FulfillmentService();
