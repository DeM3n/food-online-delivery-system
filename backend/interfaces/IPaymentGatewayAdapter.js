class IPaymentGatewayAdapter {
  getGatewayName() {
    throw new Error('getGatewayName() must be implemented');
  }

  async initiatePayment(_payload) {
    throw new Error('initiatePayment() must be implemented');
  }

  verifyReturn(_query) {
    throw new Error('verifyReturn() must be implemented');
  }

  verifyIpn(_query) {
    throw new Error('verifyIpn() must be implemented');
  }

  normalizeResult(_query, _verificationResult) {
    throw new Error('normalizeResult() must be implemented');
  }

  async queryTransaction(_payload) {
    throw new Error('queryTransaction() must be implemented');
  }

  async refund(_payload) {
    throw new Error('refund() must be implemented');
  }
}

module.exports = IPaymentGatewayAdapter;