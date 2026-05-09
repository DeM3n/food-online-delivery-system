const NotificationSender = require('./NotificationSender');
const notificationProxy = require('../../NotificationProxy');

class EmailSender extends NotificationSender {
  async send(message) {
    if (!message?.recipient) {
      return {
        ok: false,
        channel: 'email',
        message: 'Missing email recipient',
      };
    }

    try {
      if (message.eventType === 'delivery_updated' && message.status === 'delivered') {
        await notificationProxy.sendEmail('delivered', {
          to: message.recipient,
          customerName: message.customerName,
          orderId: message.orderId,
          restaurantName: message.restaurantName,
        });
      } else if (message.eventType === 'payment_updated' && (message.status === 'refunded' || message.status === 'refund_failed')) {
        await notificationProxy.sendEmail('refund', {
          to: message.recipient,
          customerName: message.customerName,
          orderId: message.orderId,
          refundAmount: message.refundAmount,
          gatewayName: message.gatewayName || 'VNPay',
          status: message.status === 'refunded' ? 'success' : 'failed',
          refundMessage: message.content,
        });
      } else {
        // Fallback or generic email
        console.log(`✉️ EmailSender: Falling back to generic approval/notification for ${message.recipient}`);
        await notificationProxy.sendEmail('approval', {
          to: message.recipient,
          fullName: message.customerName || 'User',
          accountType: 'user',
          status: message.status || 'NOTIFICATION',
          reason: message.content
        });
      }

      return { ok: true, channel: 'email' };
    } catch (error) {
      console.error('EmailSender Error:', error.message);
      return { ok: false, channel: 'email', message: error.message };
    }
  }
}

module.exports = EmailSender;