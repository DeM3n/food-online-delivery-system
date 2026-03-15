const orderService = require('../services/orderService');

// @desc    Get restaurant orders
// @route   GET /api/orders/restaurant/me
// @access  Private
exports.getRestaurantOrders = async (req, res) => {
    try {
        const { status } = req.query;
        const result = await orderService.getRestaurantOrders(req.user.id, status);
        res.json({ success: true, data: result.orders, counts: result.counts });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await orderService.updateStatus(req.params.id, status, req.user, req.io);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 : 
                           (error.message.includes('Not authorized')) ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Get user orders
// @route   GET /api/orders/me
// @access  Private
exports.getUserOrders = async (req, res) => {
    try {
        const { date, limit, offset } = req.query;
        const result = await orderService.getUserOrders(req.user.id, { date, limit, offset });
        res.json({ success: true, data: result.orders, total: result.total, confirmedCount: result.confirmedCount });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Get monthly favorite food for user
// @route   GET /api/orders/me/favorite
// @access  Private
exports.getMonthlyFavorite = async (req, res) => {
    try {
        const result = await orderService.getMonthlyFavorite(req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in getMonthlyFavorite:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
// exports.createOrder = async (req, res) => {
//     try {
//         const order = await orderService.createOrder(req.user.id, req.body, req.io);
//         res.status(201).json({ success: true, data: order });
//     } catch (error) {
//         console.error(error);
//         const statusCode = error.message.includes('not found') ? 404 : 
//                            (error.type === 'AVAILABILITY_CONFLICT') ? 400 : 500;
//         res.status(statusCode).json({ 
//             success: false, 
//             message: error.message,
//             type: error.type,
//             unavailableItems: error.unavailableItems
//         });
//     }
// };
exports.createOrder = async (req, res) => {
  try {
    const result = await orderService.createOrder(req.user.id, req.body, req.io, req);

    res.status(201).json({
      success: true,
      data: result.order,
      requiresPayment: result.requiresPayment,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes('not found')
      ? 404
      : error.type === 'AVAILABILITY_CONFLICT'
      ? 400
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
      type: error.type,
      unavailableItems: error.unavailableItems,
    });
  }
};

// @desc    Get available deliveries for drivers
// @route   GET /api/orders/deliveries/available
// @access  Private
exports.getAvailableDeliveries = async (req, res) => {
    try {
        const orders = await orderService.getAvailableDeliveries();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.acceptDelivery = async (req, res) => {
    try {
        const { driver_id } = req.body;
        const order = await orderService.acceptByDriver(req.params.id, driver_id, req.io);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Get deliveries assigned to driver
// @route   GET /api/orders/driver/me
// @access  Private
exports.getDriverDeliveries = async (req, res) => {
    try {
        const orders = await orderService.getDriverDeliveries(req.user.id);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Get deliveries history for driver
// @route   GET /api/orders/driver/me/history
// @access  Private
exports.getDriverHistory = async (req, res) => {
    try {
        const orders = await orderService.getDriverHistory(req.user.id);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Cancel order (Customer)
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
    try {
        const order = await orderService.cancelOrder(req.params.id, req.user.id, req.io);
        res.json({ success: true, message: 'Order cancelled successfully', data: order });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 : 
                           (error.message.includes('Not authorized')) ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};
