const NotificationSender = require('./NotificationSender');

function getDefaultEventName(message) {
  if (message.pushEvent) return message.pushEvent;

  switch (message.eventType) {
    case 'order_created':
      return 'ORDER_CREATED';
    case 'payment_updated':
      return 'PAYMENT_UPDATED';
    case 'delivery_updated':
      return 'ORDER_STATUS_UPDATED';
    default:
      return 'APP_NOTIFICATION';
  }
}

class PushSender extends NotificationSender {
  async send(message) {
    if (!message?.io || !message?.recipient) {
      return {
        ok: false,
        channel: 'push',
        message: 'Missing io instance or push recipient',
      };
    }

    const eventName = getDefaultEventName(message);
    const payload = message.payload || {
      orderId: message.orderId || null,
      subject: message.subject,
      content: message.content,
      status: message.status || null,
      type: message.type || 'system',
    };

    message.io.to(String(message.recipient)).emit(eventName, payload);

    return {
      ok: true,
      channel: 'push',
      eventName,
    };
  }
}

module.exports = PushSender;