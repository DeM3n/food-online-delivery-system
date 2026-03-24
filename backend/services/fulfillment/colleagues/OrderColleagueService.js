const {
  Order,
  OrderItem,
  Address,
  MenuItem,
  Restaurant,
  Customer,
  User,
} = require('../../../models');

class OrderColleagueService {
  async buildCheckoutRequest(userId, orderData) {
    const StandardCheckoutBuilder = require('../../../builders/checkout/StandardCheckoutBuilder');
    const CheckoutDirector = require('../../../builders/checkout/CheckoutDirector');

    const builder = new StandardCheckoutBuilder(userId, orderData);
    const director = new CheckoutDirector(builder);
    return director.constructRequest();
  }

  async createOrderFromCheckoutRequest(checkoutRequest, { paymentStatus = 'pending', paymentMethod = 'cod', transaction } = {}) {
    const order = await Order.create(
      {
        customer_id: checkoutRequest.customerId,
        restaurant_id: checkoutRequest.restaurantId,
        delivery_address_id: checkoutRequest.addressId,
        notes: checkoutRequest.notes,
        subtotal: checkoutRequest.subtotal,
        delivery_fee: checkoutRequest.deliveryFee,
        total_amount: checkoutRequest.totalAmount,
        status: 'pending',
        payment_status: paymentStatus,
        payment_method: paymentMethod,
      },
      { transaction }
    );

    const finalOrderItems = (checkoutRequest.finalOrderItems || []).map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
    }));

    await OrderItem.bulkCreate(finalOrderItems, { transaction });

    return order;
  }

  async createOrderFromPendingPayment(payment, { transaction } = {}) {
    const items = JSON.parse(payment.items_json || '[]');
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid items_json');
    }

    const savedDeliveryFee = Number(payment.delivery_fee || 0);
    const subtotal = Number(payment.amount) - savedDeliveryFee;

    if (subtotal < 0) {
      throw new Error('Invalid subtotal after applying delivery fee');
    }

    const order = await Order.create(
      {
        customer_id: payment.customer_id,
        restaurant_id: payment.restaurant_id,
        delivery_address_id: payment.delivery_address_id,
        notes: payment.notes || null,
        subtotal,
        delivery_fee: savedDeliveryFee,
        total_amount: Number(payment.amount),
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'online',
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      })),
      { transaction }
    );

    return order;
  }

  async hydrateOrder(orderId) {
    return Order.findByPk(orderId, {
      include: [
        { model: OrderItem, include: [{ model: MenuItem }] },
        { model: Restaurant, attributes: ['id', 'name', 'location', 'cuisine_type'] },
        { model: Address, attributes: ['id', 'street', 'city'] },
        {
          model: Customer,
          include: [{ model: User, attributes: ['id', 'email', 'full_name', 'phone_number'] }],
        },
      ],
    });
  }
}

module.exports = new OrderColleagueService();
