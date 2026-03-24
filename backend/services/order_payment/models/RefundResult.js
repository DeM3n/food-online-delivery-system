class RefundResult {
  constructor({
    success = false,
    message = '',
    responseCode = null,
    refundTransactionId = null,
    raw = null,
  } = {}) {
    this.success = Boolean(success);
    this.message = message;
    this.responseCode = responseCode;
    this.refundTransactionId = refundTransactionId;
    this.raw = raw;
  }

  isSuccess() {
    return this.success;
  }
}

module.exports = RefundResult;
