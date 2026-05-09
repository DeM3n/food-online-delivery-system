const { Restaurant, Customer, Order, OrderItem, MenuItem, Address, User, sequelize } = require('../models');
const OrderFilterChain = require('../chains/order_filters/OrderFilterChain');

class AdminService {
  async getAllOrders(restaurantId, statusFilter, page = 1, limit = 20, month, year) {
    const context = OrderFilterChain.buildContext({
      restaurantId, statusFilter, page, limit, month, year
    });

    const { where, countWhere, pagination } = context;

    const { count: total, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Restaurant,
          attributes: ['name', 'location'],
          include: [{ model: User, attributes: ['phone_number'] }]
        },
        {
          model: Customer,
          include: [{ model: User, attributes: ['full_name', 'phone_number'] }]
        },
        {
          model: OrderItem,
          include: [{ model: MenuItem, attributes: ['name', 'price', 'image_url'] }]
        },
        {
          model: Address,
          attributes: ['street', 'city', 'label']
        }
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['created_at', 'DESC']]
    });

    const statusCounts = await Order.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      where: countWhere,
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

    statusCounts.forEach((sc) => {
      if (sc.status === 'completed') {
        counts.delivered += parseInt(sc.count, 10);
      } else if (Object.prototype.hasOwnProperty.call(counts, sc.status)) {
        counts[sc.status] += parseInt(sc.count, 10);
      }
    });

    return {
      orders,
      counts,
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.max(Math.ceil(total / pagination.limit), 1)
      }
    };
  }
}

module.exports = new AdminService();
