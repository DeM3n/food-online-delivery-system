const { Notification } = require('../../../models');

class NotificationService {
  async notifyCustomer({ kind, userId, order, gatewayName, bankCode, transaction, io }) {
    if (!userId || !order?.id) {
      return null;
    }

    const payload = this.buildNotificationPayload({ kind, order, gatewayName, bankCode });

    await Notification.create(
      {
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
      },
      { transaction }
    );

    io?.to(userId).emit(payload.eventName, payload.socketData);

    return payload;
  }

  buildNotificationPayload({ kind, order, gatewayName, bankCode }) {
    if (kind === 'payment_success') {
      return {
        type: 'payment',
        title: 'Thanh toán thành công',
        message: `Đơn hàng ${order.id} đã được thanh toán qua ${(gatewayName || 'gateway').toUpperCase()}.`,
        eventName: 'PAYMENT_STATUS_UPDATED',
        socketData: {
          orderId: order.id,
          paymentStatus: 'paid',
          bankCode: bankCode || null,
        },
      };
    }

    return {
      type: 'order',
      title: 'Đặt hàng thành công',
      message: `Đơn hàng ${order.id} đã được tạo thành công.`,
      eventName: 'ORDER_STATUS_UPDATED',
      socketData: {
        orderId: order.id,
        status: order.status,
      },
    };
  }
}

module.exports = new NotificationService();
