class PaymentResult {
  constructor({
    success = false,
    transactionId = null,
    message = '',
    paymentUrl = null,
    gateway = null,
    order = null,
    requiresPayment = false,
    amount = null,
    raw = null,
  } = {}) {
    this.success = Boolean(success);
    this.transactionId = transactionId;
    this.message = message;
    this.paymentUrl = paymentUrl;
    this.gateway = gateway;
    this.order = order;
    this.requiresPayment = Boolean(requiresPayment);
    this.amount = amount == null ? null : Number(amount);
    this.raw = raw;
  }

  isSuccess() {
    return this.success;
  }
}

module.exports = PaymentResult;
