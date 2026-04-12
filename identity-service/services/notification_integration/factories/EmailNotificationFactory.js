const NotificationFactory = require('./NotificationFactory');
const EmailSender = require('../senders/EmailSender');

class EmailNotificationFactory extends NotificationFactory {
  createSender() {
    return new EmailSender();
  }
}

module.exports = EmailNotificationFactory;