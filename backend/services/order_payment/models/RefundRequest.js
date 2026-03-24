class RefundRequest {
  constructor({
    transactionId = null,
    refundAmount = 0,
    paymentMethod = '',
    payment = null,
    order = null,
    ipAddr = '127.0.0.1',
    createBy = 'system',
  } = {}) {
    this.transactionId = transactionId;
    this.refundAmount = Number(refundAmount || 0);
    this.paymentMethod = paymentMethod;
    this.payment = payment;
    this.order = order;
    this.ipAddr = ipAddr;
    this.createBy = createBy;
  }
}

module.exports = RefundRequest;
