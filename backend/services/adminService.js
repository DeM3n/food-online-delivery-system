const { User, Restaurant, Customer, DeliveryPartner, Order, OrderItem, MenuItem, Address, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendPendingApprovalStatusEmail } = require('./mailService');
const OrderFilterChain = require('../chains/order_filters/OrderFilterChain');
const authService = require('./authService');

class AdminService {
  mapPendingApprovalItem(user) {
    const isRestaurant = user.role === 'restaurant';
    const profile = isRestaurant ? user.Restaurant : user.DeliveryPartner;
    const displayName = isRestaurant
      ? (user.Restaurant?.name || user.full_name || 'Unnamed Restaurant')
      : (user.full_name || 'Unnamed Driver');

    return {
      id: user.id,
      type: isRestaurant ? 'restaurant' : 'driver',
      name: displayName,
      email: user.email,
      phone: user.phone_number,
      status: 'PENDING',
      created_at: user.created_at,
      avatarUrl: null,
      details: {
        user: {
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number
        },
        driver: !isRestaurant ? {
          id_cccd: null,
          driver_license: user.DeliveryPartner?.vehicle_license || null,
          vehicle_info: user.DeliveryPartner?.vehicle_license || null,
          uploaded_documents: []
        } : null,
        restaurant: isRestaurant ? {
          restaurant_name: user.Restaurant?.name || null,
          owner_name: user.full_name,
          email: user.email,
          phone: user.phone_number,
          address: user.Restaurant?.location || null,
          business_license: null,
          images: [],
          menu: []
        } : null,
        profile
      }
    };
  }

  async getSystemStats() {
    const [userCount, restaurantCount, driverCount, orderStats] = await Promise.all([
      User.count({ where: { is_active: true } }),
      Restaurant.count({
        include: [{
          model: User,
          required: true,
          where: { is_active: true }
        }]
      }),
      DeliveryPartner.count({
        include: [{
          model: User,
          required: true,
          where: { is_active: true }
        }]
      }),
      Order.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders']
        ],
        where: {
          status: { [Op.in]: ['delivered', 'completed'] }
        }
      })
    ]);

    return {
      totalUsers: userCount,
      activeRestaurants: restaurantCount,
      deliveryPartners: driverCount,
      totalRevenue: orderStats[0]?.dataValues.totalRevenue || 0,
      totalOrders: orderStats[0]?.dataValues.totalOrders || 0
    };
  }

  async getAllUsers(status) {
    let where = {};

    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where = {
        [Op.or]: [
          { is_active: false },
          { deleted_at: { [Op.ne]: null } }
        ]
      };
    }

    return await User.findAll({
      where,
      attributes: ['id', 'email', 'full_name', 'phone_number', 'role', 'is_active', 'created_at', 'deleted_at'],
      order: [['created_at', 'DESC']],
      paranoid: false
    });
  }

  async updateUserStatus(userId, isActive, currentAdminId) {
    if (typeof isActive !== 'boolean') {
      throw new Error('is_active is required and must be boolean');
    }

    if (isActive) {
      return await authService.activateAccount(userId);
    }

    return await authService.suspendAccount(userId, { currentAdminId });
  }

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
          model: DeliveryPartner,
          include: [{ model: User, attributes: ['full_name', 'phone_number'] }]
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

  async getPendingApprovals({ type = 'all', search = '', sort = 'newest', page = 1, limit = 9 }) {
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 9, 1);

    const where = {
      role: { [Op.in]: ['restaurant', 'delivery_partner'] },
      is_active: false
    };

    if (search) {
      where[Op.or] = [
        { email: { [Op.like]: `%${search}%` } },
        { full_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'full_name', 'phone_number', 'role', 'created_at'],
      include: [
        { model: Restaurant, attributes: ['id', 'name', 'location', 'cuisine_type', 'opening_hours', 'is_open', 'rating', 'delivery_radius'] },
        { model: DeliveryPartner, attributes: ['id', 'vehicle_license', 'is_available', 'rating'] }
      ],
      order: [['created_at', sort === 'oldest' ? 'ASC' : 'DESC']]
    });

    let items = users.map((user) => this.mapPendingApprovalItem(user));

    if (type === 'driver' || type === 'restaurant') {
      items = items.filter((item) => item.type === type);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter((item) =>
        item.name?.toLowerCase().includes(searchLower) ||
        item.email?.toLowerCase().includes(searchLower)
      );
    }

    const total = items.length;
    const offset = (parsedPage - 1) * parsedLimit;
    const paginatedItems = items.slice(offset, offset + parsedLimit);

    return {
      items: paginatedItems,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.max(Math.ceil(total / parsedLimit), 1)
      }
    };
  }

  async getPendingApprovalById(userId) {
    const user = await User.findOne({
      where: {
        id: userId,
        role: { [Op.in]: ['restaurant', 'delivery_partner'] },
        is_active: false
      },
      attributes: ['id', 'email', 'full_name', 'phone_number', 'role', 'created_at'],
      include: [
        { model: Restaurant, attributes: ['id', 'name', 'location', 'cuisine_type', 'opening_hours', 'is_open', 'rating', 'delivery_radius'] },
        { model: DeliveryPartner, attributes: ['id', 'vehicle_license', 'is_available', 'rating'] }
      ]
    });

    if (!user) {
      throw new Error('Pending approval request not found');
    }

    return this.mapPendingApprovalItem(user);
  }

  async approvePendingRequest(userId) {
    const user = await User.findOne({
      where: {
        id: userId,
        role: { [Op.in]: ['restaurant', 'delivery_partner'] }
      }
    });

    if (!user) {
      throw new Error('Approval request not found');
    }

    const updated = await authService.activateAccount(userId);

    try {
      await sendPendingApprovalStatusEmail({
        to: user.email,
        fullName: user.full_name,
        accountType: user.role === 'restaurant' ? 'restaurant' : 'delivery_partner',
        status: 'APPROVED'
      });
    } catch (mailError) {
      console.error('Failed to send approval email:', mailError.message || mailError);
    }

    return { id: user.id, status: 'APPROVED', state: updated.state };
  }

  async rejectPendingRequest(userId, reason = '') {
    const user = await User.findOne({
      where: {
        id: userId,
        role: { [Op.in]: ['restaurant', 'delivery_partner'] }
      },
      include: [Restaurant, DeliveryPartner]
    });

    if (!user) {
      throw new Error('Approval request not found');
    }

    const email = user.email;
    const fullName = user.full_name;
    const accountType = user.role === 'restaurant' ? 'restaurant' : 'delivery_partner';

    if (user.Restaurant) {
      await user.Restaurant.destroy();
    } else if (user.DeliveryPartner) {
      await user.DeliveryPartner.destroy();
    }

    await user.destroy();

    try {
      await sendPendingApprovalStatusEmail({
        to: email,
        fullName,
        accountType,
        status: 'REJECTED',
        reason
      });
    } catch (mailError) {
      console.error('Failed to send rejection email:', mailError.message || mailError);
    }

    return { id: user.id, status: 'REJECTED', reason: reason || null };
  }
}

module.exports = new AdminService();
