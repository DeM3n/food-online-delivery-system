const PaymentStrategy = require('./PaymentStrategy');
const PaymentResult = require('../models/PaymentResult');

class OnlinePaymentStrategy extends PaymentStrategy {
  constructor({ paymentService, paymentGatewayAdapter, gatewayName = 'vnpay' }) {
    super();
    this.paymentService = paymentService;
    this.paymentGatewayAdapter = paymentGatewayAdapter;
    this.gatewayName = gatewayName;
  }

  async execute(orderContext) {
    const { userId, checkoutRequest, ipAddr } = orderContext;

    const prepared = await this.paymentService.prepareGatewayPayment({
      userId,
      restaurantId: checkoutRequest.restaurantId,
      addressId: checkoutRequest.addressId,
      notes: checkoutRequest.notes,
      deliveryFee: checkoutRequest.deliveryFee,
      gatewayName: orderContext.gatewayName || this.gatewayName,
      ipAddr,
    });

    const gatewayResult = await this.paymentGatewayAdapter.processPayment(prepared.paymentRequest);

    return new PaymentResult({
      success: gatewayResult.isSuccess(),
      transactionId: gatewayResult.transactionId || prepared.txnRef,
      message: gatewayResult.message || 'Online payment initialized',
      paymentUrl: gatewayResult.paymentUrl,
      gateway: gatewayResult.gateway || prepared.gateway,
      order: null,
      requiresPayment: true,
      amount: prepared.amount,
      raw: {
        subtotal: prepared.subtotal,
        delivery_fee: prepared.delivery_fee,
        paymentId: prepared.paymentId,
      },
    });
  }
}

module.exports = OnlinePaymentStrategy;
