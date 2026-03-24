const fulfillmentService = require('../services/fulfillment/fulfillmentService');
const restaurantOpsService = require('../services/restaurant_ops/restaurantOpsService');
const deliveryMgmtService = require('../services/delivery_mgmt/deliveryMgmtService');
const paymentService = require('../services/paymentService');
const restaurantPortal = require('../commands/RestaurantPortal');
const AcceptOrderCommand = require('../commands/AcceptOrderCommand');
const RejectOrderCommand = require('../commands/RejectOrderCommand');
const MarkReadyCommand = require('../commands/MarkReadyCommand');

exports.getRestaurantOrders = async (req, res) => {
    try {
        const { status, date } = req.query;
        const result = await restaurantOpsService.getRestaurantOrders(req.user.id, status, date);
        res.json({ success: true, data: result.orders, counts: result.counts });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        let order;

        if (status === 'accepted') {
            const command = new AcceptOrderCommand(fulfillmentService, req.params.id, req.user, req.io);
            order = await restaurantPortal.submitCommand(command);
        } else if (status === 'cancelled') {
            const command = new RejectOrderCommand(fulfillmentService, req.params.id, req.user, req.io);
            order = await restaurantPortal.submitCommand(command);
        } else if (status === 'preparing') {
            const command = new MarkReadyCommand(fulfillmentService, req.params.id, req.user, req.io);
            order = await restaurantPortal.submitCommand(command);
        } else {
            order = await fulfillmentService.updateStatus(req.params.id, status, req.user, req.io);
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 :
                           (error.message.includes('Not authorized')) ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getUserOrders = async (req, res) => {
    try {
        const { date, limit, offset } = req.query;
        const result = await fulfillmentService.getUserOrders(req.user.id, { date, limit, offset });
        res.json({ success: true, data: result.orders, total: result.total, confirmedCount: result.confirmedCount });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getMonthlyFavorite = async (req, res) => {
    try {
        const result = await fulfillmentService.getMonthlyFavorite(req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in getMonthlyFavorite:', error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.createOrder = async (req, res) => {
  try {
    const result = await fulfillmentService.createOrder(req.user.id, req.body, req.io, req);

    res.status(201).json({
      success: true,
      data: result.order,
      requiresPayment: result.requiresPayment,
      paymentUrl: result.paymentUrl,
      txnRef: result.txnRef,
      amount: result.amount,
      gateway: result.gateway,
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.message.includes('not found')
      ? 404
      : error.type === 'RESTAURANT_CLOSED'
      ? 400
      : error.type === 'AVAILABILITY_CONFLICT'
      ? 400
      : error.message.includes('Unsupported payment method')
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

exports.getAvailableDeliveries = async (req, res) => {
    try {
        const orders = await deliveryMgmtService.getAvailableDeliveries();
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.acceptDelivery = async (req, res) => {
    try {
        const { driver_id } = req.body;
        const order = await deliveryMgmtService.acceptByDriver(req.params.id, driver_id, req.io);
        res.json({ success: true, data: order });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getDriverDeliveries = async (req, res) => {
    try {
        const orders = await deliveryMgmtService.getDriverDeliveries(req.user.id);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getDriverHistory = async (req, res) => {
    try {
        const orders = await deliveryMgmtService.getDriverHistory(req.user.id);
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getRestaurantYearlySummary = async (req, res) => {
    try {
        const { year } = req.query;
        const data = await restaurantOpsService.getRestaurantYearlySummary(req.user.id, year);
        res.json({ success: true, data });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const result = await fulfillmentService.cancelOrder(req.params.id, req.user.id, req.io, req);

        res.json({
          success: true,
          message: result.refund?.refunded
            ? 'Order refunded successfully'
            : 'Order cancelled successfully',
          data: result.order,
          refund: result.refund,
        });
    } catch (error) {
        console.error(error);
        const statusCode = (error.message.includes('not found')) ? 404 :
                           (error.message.includes('Not authorized')) ? 403 : 400;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};
