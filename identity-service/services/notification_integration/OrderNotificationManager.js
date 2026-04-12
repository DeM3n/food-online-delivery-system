const NotificationMessage = require('./NotificationMessage');
const EmailNotificationFactory = require('./factories/EmailNotificationFactory');
const SmsNotificationFactory = require('./factories/SmsNotificationFactory');
const PushNotificationFactory = require('./factories/PushNotificationFactory');

class OrderNotificationManager {
  constructor() {
    this.notificationFactory = new PushNotificationFactory();
  }

  selectFactory(channel) {
    switch (String(channel || 'push').toLowerCase()) {
      case 'email':
        this.notificationFactory = new EmailNotificationFactory();
        break;
      case 'sms':
        this.notificationFactory = new SmsNotificationFactory();
        break;
      case 'push':
      default:
        this.notificationFactory = new PushNotificationFactory();
        break;
    }

    return this.notificationFactory;
  }

  async dispatch(message) {
    const normalized =
      message instanceof NotificationMessage
        ? message
        : new NotificationMessage(message || {});

    const factory = this.selectFactory(normalized.getChannel());
    return factory.sendNotification(normalized);
  }

  async dispatchMany(messages = []) {
    return Promise.allSettled((messages || []).map((message) => this.dispatch(message)));
  }
}

module.exports = OrderNotificationManager;