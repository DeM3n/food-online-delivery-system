const NotificationMessage = require('./NotificationMessage');
const OrderNotificationManager = require('./OrderNotificationManager');

class NotificationService {
  constructor() {
    this.manager = new OrderNotificationManager();
  }

  normalizeMessage(message, defaults = {}) {
    return message instanceof NotificationMessage
      ? message
      : new NotificationMessage({
          ...defaults,
          ...(message || {}),
        });
  }

  async notifyOrderCreated(message) {
    const normalized = this.normalizeMessage(message, {
      eventType: 'order_created',
      type: 'order',
      subject: 'Đặt hàng thành công',
    });

    return this.manager.dispatch(normalized);
  }

  async notifyPaymentUpdated(message) {
    const normalized = this.normalizeMessage(message, {
      eventType: 'payment_updated',
      type: 'payment',
      subject: 'Cập nhật thanh toán',
    });

    return this.manager.dispatch(normalized);
  }

  async notifyDeliveryUpdated(message) {
    const normalized = this.normalizeMessage(message, {
      eventType: 'delivery_updated',
      type: 'delivery',
      subject: 'Cập nhật giao hàng',
    });

    return this.manager.dispatch(normalized);
  }

  async notifyMany(messages = []) {
    return this.manager.dispatchMany(messages);
  }
}

module.exports = new NotificationService();