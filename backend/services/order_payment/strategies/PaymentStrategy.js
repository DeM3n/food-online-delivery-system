class PaymentStrategy {
  async execute(_orderContext) {
    throw new Error('execute(orderContext) must be implemented by concrete PaymentStrategy');
  }
}

module.exports = PaymentStrategy;
