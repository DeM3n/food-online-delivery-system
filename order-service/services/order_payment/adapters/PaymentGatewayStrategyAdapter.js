const PaymentGatewayFactory = require('../../../factories/paymentGatewayFactory');
const PaymentResult = require('../models/PaymentResult');
const RefundResult = require('../models/RefundResult');

class PaymentGatewayStrategyAdapter {
  constructor(gatewayName = 'vnpay') {
    this.gatewayName = gatewayName;
  }

  resolveGateway(paymentMethod) {
    return PaymentGatewayFactory.create(paymentMethod || this.gatewayName);
  }

  async processPayment(request) {
    const gateway = this.resolveGateway(request.paymentMethod);
    const { paymentUrl } = await gateway.initiatePayment({
      txnRef: request.transactionId || request.orderId,
      amount: request.amount,
      orderInfo: request.orderInfo,
      returnUrl: request.returnUrl,
      ipAddr: request.ipAddr,
      locale: request.locale,
      createDate: request.createDate,
      expireAt: request.expireAt,
    });

    return new PaymentResult({
      success: true,
      transactionId: request.transactionId || request.orderId,
      message: 'Redirect to payment gateway',
      paymentUrl,
      gateway: gateway.getGatewayName(),
      requiresPayment: true,
      amount: request.amount,
      raw: { paymentMethod: request.paymentMethod, metadata: request.metadata || {} },
    });
  }

  async processRefund(request) {
    const gateway = this.resolveGateway(request.paymentMethod);
    const result = await gateway.refund({
      payment: request.payment,
      order: request.order,
      amount: request.refundAmount,
      ipAddr: request.ipAddr,
      createBy: request.createBy,
    });

    return new RefundResult({
      success: Boolean(result?.ok),
      message: result?.message || '',
      responseCode: result?.responseCode || null,
      refundTransactionId: result?.refundTransactionId || null,
      raw: result,
    });
  }
}

module.exports = PaymentGatewayStrategyAdapter;
