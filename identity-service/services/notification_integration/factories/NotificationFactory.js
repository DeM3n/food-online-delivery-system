class NotificationFactory {
  createSender() {
    throw new Error('createSender() must be implemented by concrete factory');
  }

  async sendNotification(message) {
    const sender = this.createSender();
    return sender.send(message);
  }
}

module.exports = NotificationFactory;