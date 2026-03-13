const { Order, User, Customer, OrderItem, MenuItem, Restaurant, Address, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant/:restaurantId
// @access  Private
exports.getRestaurantOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { restaurant_id: req.params.restaurantId },
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
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.status = status;
        await order.save();
        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get user orders
// @route   GET /api/orders/user/:userId
// @access  Private
exports.getUserOrders = async (req, res) => {
    try {
        const customer = await Customer.findOne({ where: { user_id: req.params.userId } });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const orders = await Order.findAll({
            where: { customer_id: customer.id },
            include: [
                { model: Restaurant, attributes: ['name', 'logo_url'] },
                { model: OrderItem, include: [{ model: MenuItem }] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get monthly favorite food for user
// @route   GET /api/orders/user/:userId/favorite
// @access  Private
exports.getMonthlyFavorite = async (req, res) => {
    try {
        const customer = await Customer.findOne({ where: { user_id: req.params.userId } });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // 1. Tìm ID món ăn xuất hiện nhiều nhất trong tháng
        const favoriteData = await OrderItem.findOne({
            attributes: [
                'menu_item_id',
                [sequelize.fn('COUNT', sequelize.col('menu_item_id')), 'count']
            ],
            include: [{
                model: Order,
                where: {
                    customer_id: customer.id,
                    created_at: { [Op.gte]: startOfMonth }
                },
                attributes: []
            }],
            group: ['menu_item_id'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 1,
            raw: true
        });

        let result = null;
        if (favoriteData && favoriteData.menu_item_id) {
            // 2. Lấy thông tin chi tiết của món đó
            const menuItem = await MenuItem.findByPk(favoriteData.menu_item_id);
            if (menuItem) {
                result = {
                    ...menuItem.toJSON(),
                    count: favoriteData.count
                };
            }
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in getMonthlyFavorite:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { 
            restaurant_id, 
            items, 
            subtotal, 
            delivery_fee, 
            total_amount, 
            delivery_address_id, 
            address_details, 
            notes,
            payment_method 
        } = req.body;

        const user_id = req.user.id;
        const customer = await Customer.findOne({ where: { user_id } });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        let final_address_id = delivery_address_id;

        // If a new address string is provided, create it
        if (address_details && !final_address_id) {
            const newAddress = await Address.create({
                customer_id: customer.id,
                street: address_details,
                city: 'Food City', // Default
                is_default: false
            }, { transaction: t });
            final_address_id = newAddress.id;
        }

        // Create the order
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

        // Create order items
        const orderItems = items.map(item => ({
            order_id: order.id,
            menu_item_id: item.id,
            menu_item_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: item.price * item.quantity
        }));

        await OrderItem.bulkCreate(orderItems, { transaction: t });

        // Notification for restaurant
        const restaurant = await Restaurant.findByPk(restaurant_id);
        if (restaurant) {
            await Notification.create({
                user_id: restaurant.user_id,
                type: 'order',
                title: 'New Order Received',
                message: `You have a new order (#${order.id.slice(0,8)}) for ${total_amount.toLocaleString()}đ`,
                is_read: false
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get available deliveries for drivers
// @route   GET /api/orders/deliveries/available
// @access  Private
exports.getAvailableDeliveries = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: {
                status: 'ready_for_pickup',
                delivery_partner_id: null
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id'] },
                { model: Address, attributes: ['street', 'city'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] }
            ],
            order: [['updated_at', 'ASC']]
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Driver accepts a delivery
// @route   PUT /api/orders/:id/accept-delivery
// @access  Private
exports.acceptDelivery = async (req, res) => {
    try {
        const { driver_id } = req.body;
        const order = await Order.findByPk(req.params.id);
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (order.status !== 'ready_for_pickup' || order.delivery_partner_id) {
            return res.status(400).json({ success: false, message: 'Order is no longer available' });
        }

        order.delivery_partner_id = driver_id;
        order.status = 'out_for_delivery';
        await order.save();

        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get deliveries assigned to driver
// @route   GET /api/orders/driver/:driverId
// @access  Private
exports.getDriverDeliveries = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: {
                delivery_partner_id: req.params.driverId,
                status: 'out_for_delivery'
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id'] },
                { model: Address, attributes: ['street', 'city'] },
                { model: Customer, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] }
            ],
            order: [['updated_at', 'DESC']]
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
// @desc    Get deliveries history for driver
// @route   GET /api/orders/driver/:driverId/history
// @access  Private
exports.getDriverHistory = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: {
                delivery_partner_id: req.params.driverId,
                status: 'delivered'
            },
            include: [
                { model: Restaurant, attributes: ['name', 'user_id'] },
                { model: Address, attributes: ['street', 'city'] }
            ],
            order: [['updated_at', 'DESC']]
        });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
