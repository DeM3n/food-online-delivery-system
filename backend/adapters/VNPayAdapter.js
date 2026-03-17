const IPaymentGatewayAdapter = require('../interfaces/IPaymentGatewayAdapter');
const { vnpay, ProductCode, VnpLocale, dateFormat } = require('../config/vnpay');
const axios = require('axios');
const crypto = require('crypto');

class VNPayAdapter extends IPaymentGatewayAdapter {
  getGatewayName() {
    return 'vnpay';
  }

  formatVnpDate(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  signData(data) {
    const secret = process.env.VNP_HASHSECRET;
    return crypto.createHmac('sha512', secret).update(data, 'utf8').digest('hex');
  }

  async initiatePayment({
    txnRef,
    amount,
    orderInfo,
    returnUrl,
    ipAddr,
    locale = 'vn',
    expireAt,
    createDate,
  }) {
    const expireDate = expireAt || (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })();

    const safeCreateDate = createDate || dateFormat(new Date());

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
      vnp_CreateDate: safeCreateDate,
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

  buildQueryPayload({ payment, ipAddr }) {
    const tmnCode = process.env.VNP_TMNCODE;
    const requestId = `QD${Date.now()}`.slice(0, 32);
    const createDate = this.formatVnpDate(new Date());
    const transactionDate = payment.gateway_create_date;

    if (!transactionDate) {
      throw new Error('Missing original gateway_create_date for query');
    }

    const payload = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: tmnCode,
      vnp_TxnRef: payment.transaction_id,
      vnp_OrderInfo: `Query transaction ${payment.transaction_id}`,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddr || '127.0.0.1',
    };

    const signData = [
      payload.vnp_RequestId,
      payload.vnp_Version,
      payload.vnp_Command,
      payload.vnp_TmnCode,
      payload.vnp_TxnRef,
      payload.vnp_TransactionDate,
      payload.vnp_CreateDate,
      payload.vnp_IpAddr,
      payload.vnp_OrderInfo,
    ].join('|');

    payload.vnp_SecureHash = this.signData(signData);
    return payload;
  }

  async queryTransaction({ payment, ipAddr }) {
    const url = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
    const payload = this.buildQueryPayload({ payment, ipAddr });

    const { data } = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('VNPay queryDr raw result =', data);

    return {
      ok: data?.vnp_ResponseCode === '00',
      responseCode: data?.vnp_ResponseCode || '99',
      message: data?.vnp_Message || 'Unknown query response',
      txnRef: data?.vnp_TxnRef || payment.transaction_id,
      transactionNo: data?.vnp_TransactionNo || payment.gateway_transaction_id || '',
      amount: Number(data?.vnp_Amount || 0),
      transactionStatus: data?.vnp_TransactionStatus || '',
      raw: data,
    };
  }

  buildRefundPayload({ payment, order, amount, ipAddr, createBy = 'system' }) {
    const tmnCode = process.env.VNP_TMNCODE;
    const requestId = `RF${Date.now()}`.slice(0, 32);
    const createDate = this.formatVnpDate(new Date());
    const transactionDate = payment.gateway_create_date;

    if (!transactionDate) {
      throw new Error('Missing original gateway_create_date for refund');
    }

    const payload = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: tmnCode,
      vnp_TransactionType: '02', // full refund
      vnp_TxnRef: payment.transaction_id,
      vnp_Amount: Math.round(Number(amount)),
      vnp_TransactionNo: payment.gateway_transaction_id || '',
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: createBy,
      vnp_CreateDate: createDate,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_OrderInfo: `Refund for order ${order.id}`,
    };

    const signData = [
      payload.vnp_RequestId,
      payload.vnp_Version,
      payload.vnp_Command,
      payload.vnp_TmnCode,
      payload.vnp_TransactionType,
      payload.vnp_TxnRef,
      payload.vnp_Amount,
      payload.vnp_TransactionNo,
      payload.vnp_TransactionDate,
      payload.vnp_CreateBy,
      payload.vnp_CreateDate,
      payload.vnp_IpAddr,
      payload.vnp_OrderInfo,
    ].join('|');

    payload.vnp_SecureHash = this.signData(signData);
    return payload;
  }

  async refund({ payment, order, amount, ipAddr, createBy = 'system' }) {
    const url = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
    const payload = this.buildRefundPayload({ payment, order, amount, ipAddr, createBy });

    const { data } = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('VNPay refund raw result =', data);

    return {
      ok: data?.vnp_ResponseCode === '00',
      responseCode: data?.vnp_ResponseCode || '99',
      message: data?.vnp_Message || 'Unknown refund response',
      refundTransactionId: data?.vnp_ResponseId || null,
      raw: data,
    };
  }
}

module.exports = VNPayAdapter;