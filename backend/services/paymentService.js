const {
  sequelize,
  Payment,
  Order,
  OrderItem,
  Notification,
  Customer,
  Address,
  Cart,
  CartItem,
  MenuItem,
} = require('../models');
const PaymentGatewayFactory = require('../factories/paymentGatewayFactory');

const FRONTEND_RETURN_URL =
  process.env.FRONTEND_VNPAY_RETURN_URL || 'http://localhost:5173/payment-result';

class PaymentService {
  getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();

    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    ).replace('::ffff:', '');
  }

  generateTxnRef(seed = '') {
    const compact = String(seed).replace(/-/g, '').slice(0, 20);
    return `OD${Date.now()}${compact}`.slice(0, 40);
  }

  async createCheckoutSession({
    userId,
    restaurantId,
    addressId,
    notes,
    deliveryFee = 0,
    gatewayName = 'vnpay',
    ipAddr,
  }) {
    const customer = await Customer.findOne({ where: { user_id: userId } });
    if (!customer) throw new Error('Customer not found');

    const address = await Address.findOne({
      where: {
        id: addressId,
        customer_id: customer.id,
      },
    });
    if (!address) throw new Error('Delivery address not found');

    const normalizedDeliveryFee = Number(deliveryFee || 0);
    if (Number.isNaN(normalizedDeliveryFee) || normalizedDeliveryFee < 0) {
      throw new Error('delivery_fee must be a number greater than or equal to 0');
    }

    const cart = await Cart.findOne({
      where: { customer_id: customer.id, restaurant_id: restaurantId },
      include: [{
        model: CartItem,
        include: [{ model: MenuItem }],
      }],
    });

    if (!cart || !cart.CartItems?.length) {
      throw new Error('Cart is empty');
    }

    let subtotal = 0;
    const items = cart.CartItems.map((cartItem) => {
      if (!cartItem.MenuItem) throw new Error('Menu item not found');
      if (!cartItem.MenuItem.is_available) {
        throw new Error(`Item ${cartItem.MenuItem.name} is unavailable`);
      }

      const quantity = Number(cartItem.quantity || 0);
      if (!quantity || quantity <= 0) {
        throw new Error(`Invalid quantity for item ${cartItem.MenuItem.id}`);
      }

      const unitPrice = Number(cartItem.MenuItem.price);
      const lineSubtotal = unitPrice * quantity;
      subtotal += lineSubtotal;

      return {
        menu_item_id: cartItem.MenuItem.id,
        menu_item_name: cartItem.MenuItem.name,
        quantity,
        unit_price: unitPrice,
        subtotal: lineSubtotal,
      };
    });

    const totalAmount = subtotal + normalizedDeliveryFee;
    const txnRef = this.generateTxnRef(customer.id);
    const gateway = PaymentGatewayFactory.create(gatewayName);

    await Payment.create({
      order_id: null,
      customer_id: customer.id,
      restaurant_id: restaurantId,
      delivery_address_id: addressId,
      notes: notes || null,
      items_json: JSON.stringify(items),
      delivery_fee: normalizedDeliveryFee,
      amount: totalAmount,
      currency: 'VND',
      transaction_id: txnRef,
      payment_gateway: gateway.getGatewayName(),
      payment_method: gateway.getGatewayName(),
      status: 'pending',
    });

    const { paymentUrl } = await gateway.initiatePayment({
      txnRef,
      amount: totalAmount,
      orderInfo: `Thanh toan don hang ${txnRef}`,
      returnUrl: process.env.VNP_RETURN_URL || 'http://localhost:5001/api/payments/vnpay/return',
      ipAddr,
      locale: process.env.VNP_LOCALE || 'vn',
    });

    return {
      txnRef,
      paymentUrl,
      subtotal,
      delivery_fee: normalizedDeliveryFee,
      amount: totalAmount,
      gateway: gateway.getGatewayName(),
    };
  }

  async finalizeGatewayResult({ gatewayName = 'vnpay', query, source = 'return', io }) {
    const gateway = PaymentGatewayFactory.create(gatewayName);
    const verification = source === 'ipn' ? gateway.verifyIpn(query) : gateway.verifyReturn(query);
    const result = gateway.normalizeResult(query, verification);

    if (!result.verified) {
      return {
        ok: false,
        verified: false,
        success: false,
        responseCode: '97',
        message: 'Invalid checksum',
      };
    }

    const payment = await Payment.findOne({ where: { transaction_id: result.txnRef } });
    if (!payment) {
      return {
        ok: false,
        verified: true,
        success: false,
        responseCode: '01',
        message: 'Payment session not found',
      };
    }

    if (String(Math.round(Number(payment.amount))) !== String(Math.round(Number(result.amount)))) {
      return {
        ok: false,
        verified: true,
        success: false,
        responseCode: '04',
        message: 'Invalid amount',
      };
    }

    if (payment.status === 'paid' && payment.order_id) {
      return {
        ok: true,
        verified: true,
        success: true,
        responseCode: '00',
        message: 'Already finalized',
        orderId: payment.order_id,
        txnRef: payment.transaction_id,
      };
    }

    const transaction = await sequelize.transaction();

    try {
      if (!result.success) {
        payment.status = ['24', '10', '11'].includes(result.responseCode) ? 'cancelled' : 'failed';
        payment.gateway_transaction_id = result.transactionNo || null;
        await payment.save({ transaction });
        await transaction.commit();

        return {
          ok: true,
          verified: true,
          success: false,
          responseCode: result.responseCode,
          message: 'Payment failed or cancelled',
          txnRef: payment.transaction_id,
        };
      }

      const items = JSON.parse(payment.items_json || '[]');
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Invalid items_json');
      }

      const savedDeliveryFee = Number(payment.delivery_fee || 0);
      const subtotal = Number(payment.amount) - savedDeliveryFee;

      if (subtotal < 0) {
        throw new Error('Invalid subtotal after applying delivery fee');
      }

      const order = await Order.create({
        customer_id: payment.customer_id,
        restaurant_id: payment.restaurant_id,
        delivery_address_id: payment.delivery_address_id,
        notes: payment.notes || null,
        subtotal,
        delivery_fee: savedDeliveryFee,
        total_amount: Number(payment.amount),
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'online',
      }, { transaction });

      await OrderItem.bulkCreate(
        items.map((item) => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          menu_item_name: item.menu_item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
        { transaction }
      );

      payment.order_id = order.id;
      payment.status = 'paid';
      payment.gateway_transaction_id = result.transactionNo || null;
      payment.payment_gateway = gateway.getGatewayName();
      payment.payment_method = gateway.getGatewayName();
      payment.currency = 'VND';
      payment.paid_at = new Date();
      await payment.save({ transaction });

      await Notification.create({
        user_id: payment.customer_id,
        type: 'payment',
        title: 'Thanh toán thành công',
        message: `Đơn hàng ${order.id} đã được thanh toán qua ${gateway.getGatewayName().toUpperCase()}.`,
      }, { transaction });

      const cart = await Cart.findOne({
        where: { customer_id: payment.customer_id, restaurant_id: payment.restaurant_id },
        transaction,
      });
      if (cart) {
        await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
        cart.restaurant_id = null;
        await cart.save({ transaction });
      }

      await transaction.commit();

      io?.to(payment.customer_id).emit('payment_success', {
        orderId: order.id,
        transactionId: payment.transaction_id,
        bankCode: result.bankCode,
      });

      return {
        ok: true,
        verified: true,
        success: true,
        responseCode: '00',
        message: 'Confirm Success',
        orderId: order.id,
        txnRef: payment.transaction_id,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  buildFrontendReturnUrl(payload) {
    const redirectUrl = new URL(FRONTEND_RETURN_URL);
    redirectUrl.searchParams.set('success', payload.success ? '1' : '0');
    redirectUrl.searchParams.set('txnRef', payload.txnRef || '');
    redirectUrl.searchParams.set('responseCode', payload.responseCode || '');
    redirectUrl.searchParams.set('orderId', payload.orderId || '');
    return redirectUrl.toString();
  }
}

module.exports = new PaymentService();
