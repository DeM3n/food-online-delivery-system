const { sequelize } = require('../../models');
const paymentService = require('../paymentService');
const orderColleagueService = require('./colleagues/OrderColleagueService');
const restaurantDispatchService = require('./colleagues/RestaurantDispatchService');
const deliveryService = require('./colleagues/DeliveryService');
const notificationService = require('./colleagues/NotificationService');

class OrderFulfillmentCoordinator {
  constructor({
    orderService = orderColleagueService,
    payment = paymentService,
    restaurantDispatch = restaurantDispatchService,
    delivery = deliveryService,
    notification = notificationService,
  } = {}) {
    this.orderService = orderService;
    this.paymentService = payment;
    this.restaurantDispatchService = restaurantDispatch;
    this.deliveryService = delivery;
    this.notificationService = notification;
  }

  async placeOrder({ userId, orderData, io, req }) {
    const checkoutRequest = await this.orderService.buildCheckoutRequest(userId, orderData);

    if (checkoutRequest.paymentMethod === 'vnpay' || checkoutRequest.paymentMethod === 'online') {
      const session = await this.paymentService.createCheckoutSession({
        userId,
        restaurantId: checkoutRequest.restaurantId,
        addressId: checkoutRequest.addressId,
        notes: checkoutRequest.notes,
        deliveryFee: checkoutRequest.deliveryFee,
        gatewayName: 'vnpay',
        ipAddr: this.paymentService.getClientIp(req),
      });

      return {
        order: null,
        requiresPayment: true,
        paymentUrl: session.paymentUrl,
        txnRef: session.txnRef,
        amount: session.amount,
      };
    }

    const transaction = await sequelize.transaction();

    try {
      const order = await this.orderService.createOrderFromCheckoutRequest(checkoutRequest, {
        paymentStatus: 'pending',
        paymentMethod: 'cod',
        transaction,
      });

      await this.dispatchRestaurantOrder({ order, transaction, io });
      await this.createDeliveryAssignment({ order, transaction, io });
      const socketUserId =
        payment?.customer?.user_id ||
        payment?.customer?.User?.id ||
        payment?.customer_id ||
        null;

      await this.notifyCustomer({
        kind: 'payment_success',
        userId: socketUserId,
        order,
        gatewayName,
        bankCode: result.bankCode,
        transaction,
        io,
      });

      if (socketUserId) {
        io?.to(socketUserId).emit('payment_success', {
          orderId: order.id,
          transactionId: payment.transaction_id,
          bankCode: result.bankCode,
        });
      }

      await transaction.commit();

      const fullOrder = await this.orderService.hydrateOrder(order.id);

      return {
        order: fullOrder,
        requiresPayment: false,
        paymentUrl: null,
      };
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async processPaymentResult({ gatewayName = 'vnpay', query, source = 'return', io }) {
    return this.paymentService.finalizeGatewayResult({
      gatewayName,
      query,
      source,
      io,
    });

    console.log(result);
    if (!result.verified) {
      return {
        ok: false,
        verified: false,
        success: false,
        responseCode: '97',
        message: 'Invalid checksum',
      };
    }

    const payment = await this.paymentService.findPaymentByTxnRef(result.txnRef);
    if (!payment) {
      return {
        ok: false,
        verified: true,
        success: false,
        responseCode: '01',
        message: 'Payment session not found',
      };
    }

    if (!this.paymentService.isValidAmount(payment, result.amount)) {
      return {
        ok: false,
        verified: true,
        success: false,
        responseCode: '04',
        message: 'Invalid amount',
      };
    }

    if (payment.status === 'paid' && payment.order_id) {
      return {
        ok: true,
        verified: true,
        success: true,
        responseCode: '00',
        message: 'Already finalized',
        orderId: payment.order_id,
        txnRef: payment.transaction_id,
      };
    }

    const transaction = await sequelize.transaction();

    try {
      if (!result.success) {
        await this.paymentService.markPaymentFailure({ payment, result, transaction });
        await transaction.commit();

        return {
          ok: true,
          verified: true,
          success: false,
          responseCode: result.responseCode,
          message: 'Payment failed or cancelled',
          txnRef: payment.transaction_id,
        };
      }

      const order = await this.orderService.createOrderFromPendingPayment(payment, { transaction });

      await this.paymentService.markPaymentPaid({
        payment,
        order,
        gatewayName,
        result,
        transaction,
      });

      await this.dispatchRestaurantOrder({ order, transaction, io });
      await this.createDeliveryAssignment({ order, transaction, io });
      await this.notifyCustomer({
        kind: 'payment_success',
        userId: payment.customer?.user_id,
        order,
        gatewayName,
        bankCode: result.bankCode,
        transaction,
        io,
      });
      await this.paymentService.clearCartForPayment({ payment, transaction });

      await transaction.commit();

      io?.to(payment.customer?.user_id || payment.customer_id).emit('payment_success', {
        orderId: order.id,
        transactionId: payment.transaction_id,
        bankCode: result.bankCode,
      });

      return {
        ok: true,
        verified: true,
        success: true,
        responseCode: '00',
        message: 'Confirm Success',
        orderId: order.id,
        txnRef: payment.transaction_id,
      };
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async dispatchRestaurantOrder({ order, transaction, io }) {
    return this.restaurantDispatchService.dispatchRestaurantOrder({ order, transaction, io });
  }

  async createDeliveryAssignment({ order, transaction, io }) {
    return this.deliveryService.createDeliveryAssignment({ order, transaction, io });
  }

  async notifyCustomer({ kind, userId, order, gatewayName, bankCode, transaction, io }) {
    return this.notificationService.notifyCustomer({
      kind,
      userId,
      order,
      gatewayName,
      bankCode,
      transaction,
      io,
    });
  }
}

module.exports = new OrderFulfillmentCoordinator();
