const NotificationFactory = require('./NotificationFactory');
const PushSender = require('../senders/PushSender');

class PushNotificationFactory extends NotificationFactory {
  createSender() {
    return new PushSender();
  }
}

module.exports = PushNotificationFactory;