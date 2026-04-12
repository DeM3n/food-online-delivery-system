const { Order, Customer, Restaurant, DeliveryPartner, User, Address } = require('../../models');
const { Op } = require('sequelize');
const { OrderStatusContext } = require('../../states/order/orderStatusState');

/**
 * Interface: IDeliveryMgmtAPI
 */
class DeliveryMgmtService {
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
}

module.exports = new DeliveryMgmtService();
