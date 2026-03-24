class NotificationMessage {
  constructor({
    recipient = '',
    channel = 'push',
    subject = '',
    content = '',
    orderId = '',
    userId = null,
    eventType = 'generic',
    status = '',
    io = null,
    pushEvent = '',
    payload = null,
    customerName = '',
    restaurantName = '',
    refundAmount = 0,
    gatewayName = '',
    type = 'system',
    metadata = {},
  } = {}) {
    this.recipient = String(recipient || '');
    this.channel = channel;
    this.subject = subject;
    this.content = content;
    this.orderId = orderId ? String(orderId) : '';
    this.userId = userId;
    this.eventType = eventType;
    this.status = status;
    this.io = io;
    this.pushEvent = pushEvent;
    this.payload = payload;
    this.customerName = customerName;
    this.restaurantName = restaurantName;
    this.refundAmount = refundAmount;
    this.gatewayName = gatewayName;
    this.type = type;
    this.metadata = metadata || {};
  }

  getChannel() {
    return this.channel;
  }
}

module.exports = NotificationMessage;