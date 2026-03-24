const { Restaurant, Notification } = require('../../../models');

class RestaurantDispatchService {
  async dispatchRestaurantOrder({ order, transaction, io }) {
    if (!order?.restaurant_id) {
      return null;
    }

    const restaurant = await Restaurant.findByPk(order.restaurant_id);
    if (!restaurant) {
      return null;
    }

    if (restaurant.user_id) {
      await Notification.create(
        {
          user_id: restaurant.user_id,
          type: 'order',
          title: 'Đơn hàng mới',
          message: `Nhà hàng của bạn vừa nhận đơn hàng ${order.id}.`,
        },
        { transaction }
      );

      io?.to(restaurant.user_id).emit('NEW_ORDER_RECEIVED', {
        orderId: order.id,
        restaurantId: restaurant.id,
        status: order.status,
      });
    }

    return {
      restaurantId: restaurant.id,
      restaurantUserId: restaurant.user_id,
      dispatched: true,
    };
  }
}

module.exports = new RestaurantDispatchService();
