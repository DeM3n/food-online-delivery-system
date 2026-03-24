class PaymentRequest {
  constructor({
    orderId = null,
    transactionId = null,
    amount = 0,
    paymentMethod = '',
    orderInfo = '',
    returnUrl = '',
    ipAddr = '127.0.0.1',
    locale = 'vn',
    createDate = null,
    expireAt = null,
    gatewayName = null,
    metadata = {},
  } = {}) {
    this.orderId = orderId;
    this.transactionId = transactionId;
    this.amount = Number(amount || 0);
    this.paymentMethod = paymentMethod;
    this.orderInfo = orderInfo;
    this.returnUrl = returnUrl;
    this.ipAddr = ipAddr;
    this.locale = locale;
    this.createDate = createDate;
    this.expireAt = expireAt;
    this.gatewayName = gatewayName || paymentMethod;
    this.metadata = metadata;
  }
}

module.exports = PaymentRequest;
