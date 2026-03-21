class CheckoutRequest {
    constructor() {
        this.userId = null;
        this.customerId = null;
        
        this.restaurantId = null;
        this.restaurant = null;

        this.addressId = null;
        this.address = null;

        this.items = [];
        this.dbItems = [];
        this.finalOrderItems = [];
        this.subtotal = 0;
        this.deliveryFee = 0;
        this.totalAmount = 0;

        this.notes = '';
        this.paymentMethod = 'cod';
        this.forceProceed = false;

        this.requiresPayment = false;
        this.paymentUrl = null;
    }

    isValid() {
        return !!(this.customerId && this.restaurantId && this.addressId && this.items.length > 0);
    }
}

module.exports = CheckoutRequest;
