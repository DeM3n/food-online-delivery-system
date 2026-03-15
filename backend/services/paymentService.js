const { sequelize, Payment, Order, Notification } = require('../models');
const { vnpay, ProductCode, VnpLocale, dateFormat } = require('../config/vnpay');

const FRONTEND_RETURN_URL =
  process.env.FRONTEND_VNPAY_RETURN_URL || 'http://localhost:5173/payment-result';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();

  return (
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  ).replace('::ffff:', '');
};

const sanitizeOrderInfo = (text = '') => {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const generateTxnRef = (orderId) => {
  const compactOrderId = String(orderId).replace(/-/g, '').slice(0, 20);
  return `OD${Date.now()}${compactOrderId}`.slice(0, 40);
};

const buildCheckoutUrl = async ({ orderId, amount, txnRef, ipAddr }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const paymentUrl = await vnpay.buildPaymentUrl({
    vnp_Amount: Math.round(Number(amount)),
    vnp_IpAddr: ipAddr,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: sanitizeOrderInfo(`Thanh toan don hang ${orderId}`),
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl:
      process.env.VNP_RETURN_URL || 'http://localhost:5001/api/payments/vnpay/return',
    vnp_Locale:
      process.env.VNP_LOCALE === 'en' ? VnpLocale.EN : VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  return paymentUrl;
};

const processVnpayIpn = async (query, io) => {
  const verifyResult = vnpay.verifyIpnCall(query);

  if (!verifyResult.isSuccess) {
    return { RspCode: '97', Message: 'Invalid Checksum' };
  }

  const txnRef = query.vnp_TxnRef;
  const responseCode = query.vnp_ResponseCode;
  const transactionNo = query.vnp_TransactionNo;
  const bankCode = query.vnp_BankCode;
  const amountFromGateway = Number(query.vnp_Amount || 0) / 100;

  const payment = await Payment.findOne({
    where: { transaction_id: txnRef },
  });

  if (!payment) {
    return { RspCode: '01', Message: 'Order not Found' };
  }

  const order = await Order.findByPk(payment.order_id);

  if (!order) {
    return { RspCode: '01', Message: 'Order not Found' };
  }

  if (String(Math.round(Number(payment.amount))) !== String(Math.round(amountFromGateway))) {
    return { RspCode: '04', Message: 'Invalid Amount' };
  }

  if (payment.status === 'paid') {
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  const t = await sequelize.transaction();

  try {
    if (responseCode === '00') {
      payment.status = 'paid';
      payment.gateway_transaction_id = transactionNo;
      payment.payment_gateway = 'vnpay';
      payment.payment_method = 'vnpay';
      payment.currency = 'VND';
      payment.paid_at = new Date();
      await payment.save({ transaction: t });

      order.payment_status = 'paid';
      await order.save({ transaction: t });

      await Notification.create(
        {
          user_id: order.customer_id,
          type: 'payment_success',
          title: 'Thanh toán thành công',
          message: `Đơn hàng ${order.id} đã được thanh toán qua VNPay.`,
        },
        { transaction: t }
      );
    } else {
      payment.status = 'failed';
      payment.gateway_transaction_id = transactionNo || null;
      payment.payment_gateway = 'vnpay';
      payment.payment_method = 'vnpay';
      await payment.save({ transaction: t });

      order.payment_status = 'failed';
      await order.save({ transaction: t });
    }

    await t.commit();

    if (responseCode === '00') {
      io?.to(order.customer_id).emit('payment_success', {
        orderId: order.id,
        transactionId: txnRef,
        bankCode,
      });
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  } catch (error) {
    await t.rollback();
    console.error('VNPay IPN error:', error);
    return { RspCode: '99', Message: 'Unknown error' };
  }
};

const buildFrontendReturnUrl = (query) => {
  const verifyResult = vnpay.verifyReturnUrl(query);
  const success = verifyResult.isSuccess && query.vnp_ResponseCode === '00';

  const redirectUrl = new URL(FRONTEND_RETURN_URL);
  redirectUrl.searchParams.set('success', success ? '1' : '0');
  redirectUrl.searchParams.set('txnRef', query.vnp_TxnRef || '');
  redirectUrl.searchParams.set('responseCode', query.vnp_ResponseCode || '');
  redirectUrl.searchParams.set('transactionNo', query.vnp_TransactionNo || '');

  return redirectUrl.toString();
};

module.exports = {
  getClientIp,
  generateTxnRef,
  buildCheckoutUrl,
  processVnpayIpn,
  buildFrontendReturnUrl,
};