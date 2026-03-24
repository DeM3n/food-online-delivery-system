const NotificationSender = require('./NotificationSender');

class SmsSender extends NotificationSender {
  async send(message) {
    console.log('[SMS placeholder]', {
      to: message?.recipient,
      subject: message?.subject,
      content: message?.content,
      orderId: message?.orderId,
    });

    return {
      ok: true,
      channel: 'sms',
      message: 'SMS sender placeholder executed',
    };
  }
}

module.exports = SmsSender;