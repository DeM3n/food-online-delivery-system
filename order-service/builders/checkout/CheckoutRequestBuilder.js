const CheckoutRequest = require('./CheckoutRequest');

/**
 * Base class for all CheckoutRequest builders.
 * Defiles the interface and common logic for building parts of a checkout request.
 */
class CheckoutRequestBuilder {
    constructor(userId, orderData) {
        this.userId = userId;
        this.orderData = orderData || {};
        this.result = new CheckoutRequest();
        this.result.userId = userId;
        this.result.notes = orderData.notes || '';
        this.result.paymentMethod = String(orderData.payment_method || 'cod').toLowerCase();
        this.result.forceProceed = !!orderData.force_proceed;
        this.result.deliveryFee = Number(orderData.delivery_fee || 0);
    }

    async buildCustomerInfo() {
        throw new Error('Method not implemented: buildCustomerInfo');
    }

    async buildRestaurantInfo() {
        throw new Error('Method not implemented: buildRestaurantInfo');
    }

    async buildAddressInfo() {
        throw new Error('Method not implemented: buildAddressInfo');
    }

    async buildCartInfo() {
        throw new Error('Method not implemented: buildCartInfo');
    }

    async buildPaymentInfo() {
        throw new Error('Method not implemented: buildPaymentInfo');
    }

    getResult() {
        return this.result;
    }
}

module.exports = CheckoutRequestBuilder;
