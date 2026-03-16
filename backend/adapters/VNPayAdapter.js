const IPaymentGatewayAdapter = require('../interfaces/IPaymentGatewayAdapter');
const { vnpay, ProductCode, VnpLocale, dateFormat } = require('../config/vnpay');

class VNPayAdapter extends IPaymentGatewayAdapter {
  getGatewayName() {
    return 'vnpay';
  }

  async initiatePayment({ txnRef, amount, orderInfo, returnUrl, ipAddr, locale = 'vn', expireAt }) {
    const expireDate = expireAt || (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })();

    const paymentUrl = await vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(Number(amount)),
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: String(orderInfo || `Thanh toan don hang ${txnRef}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: locale === 'en' ? VnpLocale.EN : VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(expireDate),
    });

    return { paymentUrl };
  }

  verifyReturn(query) {
    return vnpay.verifyReturnUrl(query);
  }

  verifyIpn(query) {
    return vnpay.verifyIpnCall(query);
  }

  normalizeResult(query, verificationResult) {
    return {
      verified: Boolean(verificationResult?.isSuccess),
      success: Boolean(verificationResult?.isSuccess) && query.vnp_ResponseCode === '00',
      responseCode: query.vnp_ResponseCode || '',
      txnRef: query.vnp_TxnRef || '',
      transactionNo: query.vnp_TransactionNo || '',
      bankCode: query.vnp_BankCode || '',
      amount: Number(query.vnp_Amount || 0) / 100,
      raw: query,
    };
  }
}

module.exports = VNPayAdapter;
