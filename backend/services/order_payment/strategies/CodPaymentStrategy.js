const PaymentStrategy = require('./PaymentStrategy');
const PaymentResult = require('../models/PaymentResult');

class CodPaymentStrategy extends PaymentStrategy {
  constructor({ sequelize, models }) {
    super();
    this.sequelize = sequelize;
    this.models = models;
  }

  async execute(orderContext) {
    const { userId, checkoutRequest } = orderContext;
    const { Order, OrderItem, Notification, MenuItem, Restaurant, Address } = this.models;

    const transaction = await this.sequelize.transaction();

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
      }, { transaction });

      const finalOrderItems = checkoutRequest.finalOrderItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }));

      await OrderItem.bulkCreate(finalOrderItems, { transaction });

      await Notification.create({
        user_id: userId,
        type: 'order',
        title: 'Đặt hàng thành công',
        message: `Đơn hàng ${order.id} đã được tạo thành công.`,
      }, { transaction });

      await transaction.commit();

      const fullOrder = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, include: [{ model: MenuItem }] },
          { model: Restaurant, attributes: ['id', 'name'] },
          { model: Address, attributes: ['id', 'street', 'city'] },
        ],
      });

      return new PaymentResult({
        success: true,
        transactionId: order.id,
        message: 'Order placed successfully with COD',
        gateway: 'cod',
        order: fullOrder,
        requiresPayment: false,
        amount: checkoutRequest.totalAmount,
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

module.exports = CodPaymentStrategy;
