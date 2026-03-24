const PaymentStrategy = require('./PaymentStrategy');
const PaymentResult = require('../models/PaymentResult');

class WalletPaymentStrategy extends PaymentStrategy {
  async execute() {
    return new PaymentResult({
      success: false,
      message: 'Wallet payment strategy is scaffolded, but no wallet gateway adapter is configured yet.',
      gateway: 'wallet',
      requiresPayment: false,
    });
  }
}

module.exports = WalletPaymentStrategy;
