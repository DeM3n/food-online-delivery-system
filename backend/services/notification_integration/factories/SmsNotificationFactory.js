const NotificationFactory = require('./NotificationFactory');
const SmsSender = require('../senders/SmsSender');

class SmsNotificationFactory extends NotificationFactory {
  createSender() {
    return new SmsSender();
  }
}

module.exports = SmsNotificationFactory;