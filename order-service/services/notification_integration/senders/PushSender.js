const NotificationSender = require('./NotificationSender');
const notificationProxy = require('../../NotificationProxy');

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
    if (!message?.recipient) {
      return {
        ok: false,
        channel: 'push',
        message: 'Missing push recipient',
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

    // Call Microservice instead of local io.emit
    await notificationProxy.emitRealtime(String(message.recipient), eventName, payload);

    return {
      ok: true,
      channel: 'push',
      eventName,
    };
  }
}

module.exports = PushSender;