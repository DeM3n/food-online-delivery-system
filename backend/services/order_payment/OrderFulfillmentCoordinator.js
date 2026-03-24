const PaymentGatewayStrategyAdapter = require('./adapters/PaymentGatewayStrategyAdapter');
const CodPaymentStrategy = require('./strategies/CodPaymentStrategy');
const OnlinePaymentStrategy = require('./strategies/OnlinePaymentStrategy');
const WalletPaymentStrategy = require('./strategies/WalletPaymentStrategy');

class OrderFulfillmentCoordinator {
  constructor({ paymentService, sequelize, models }) {
    this.paymentStrategy = null;
    this.strategies = {
      cod: new CodPaymentStrategy({ sequelize, models }),
      vnpay: new OnlinePaymentStrategy({
        paymentService,
        paymentGatewayAdapter: new PaymentGatewayStrategyAdapter('vnpay'),
        gatewayName: 'vnpay',
      }),
      online: new OnlinePaymentStrategy({
        paymentService,
        paymentGatewayAdapter: new PaymentGatewayStrategyAdapter('vnpay'),
        gatewayName: 'vnpay',
      }),
      wallet: new WalletPaymentStrategy(),
    };
  }

  setPaymentStrategy(strategy) {
    this.paymentStrategy = strategy;
  }

  resolveStrategy(paymentMethod) {
    const normalized = String(paymentMethod || 'cod').toLowerCase();
    if (!this.strategies[normalized]) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
    return this.strategies[normalized];
  }

  async placeOrder(orderContext) {
    const paymentMethod = orderContext?.checkoutRequest?.paymentMethod || orderContext?.paymentMethod;
    this.setPaymentStrategy(this.resolveStrategy(paymentMethod));
    return this.processPayment(orderContext);
  }

  async processPayment(orderContext) {
    if (!this.paymentStrategy) {
      throw new Error('Payment strategy has not been selected');
    }

    const result = await this.paymentStrategy.execute(orderContext);
    if (typeof result?.isSuccess === 'function' && !result.isSuccess()) {
      throw new Error(result.message || 'Payment processing failed');
    }

    return {
      order: result.order || null,
      requiresPayment: result.requiresPayment,
      paymentUrl: result.paymentUrl || null,
      txnRef: result.transactionId || null,
      amount: result.amount || null,
      gateway: result.gateway || null,
      message: result.message || '',
      raw: result.raw || null,
    };
  }
}

module.exports = OrderFulfillmentCoordinator;
