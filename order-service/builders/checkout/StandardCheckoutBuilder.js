const { Customer, Restaurant, Address, MenuItem, User } = require('../../models');
const { Op } = require('sequelize');
const CheckoutRequestBuilder = require('./CheckoutRequestBuilder');

/**
 * Concrete implementation of the CheckoutRequestBuilder for a normal checkout.
 * This class fetches real data from the database and performs validations.
 */
class StandardCheckoutBuilder extends CheckoutRequestBuilder {
    
    async buildCustomerInfo() {
        const customer = await Customer.findOne({ where: { user_id: this.userId } });
        if (!customer) throw new Error('Customer not found');
        this.result.customerId = customer.id;
        return this;
    }

    async buildRestaurantInfo() {
        const restaurant_id = this.orderData.restaurant_id;
        if (!restaurant_id) throw new Error('restaurant_id is required');

        const restaurant = await Restaurant.findByPk(restaurant_id);
        if (!restaurant) throw new Error('Restaurant not found');
        if (!restaurant.is_open) {
            const error = new Error('Restaurant is currently closed');
            error.type = 'RESTAURANT_CLOSED';
            throw error;
        }

        this.result.restaurantId = restaurant.id;
        this.result.restaurant = restaurant;
        return this;
    }

    async buildAddressInfo() {
        if (!this.result.customerId) throw new Error('Customer ID is required to build address');
        const delivery_address_id = this.orderData.delivery_address_id;
        if (!delivery_address_id) throw new Error('delivery_address_id is required');

        const address = await Address.findOne({
            where: { id: delivery_address_id, customer_id: this.result.customerId }
        });
        if (!address) throw new Error('Delivery address not found');
        
        this.result.addressId = address.id;
        this.result.address = address;
        return this;
    }

    async buildCartInfo() {
        if (!this.result.restaurantId) throw new Error('Restaurant ID is required to build cart info');
        const items = this.orderData.items || [];
        if (!Array.isArray(items) || items.length === 0) throw new Error('Order items are required');

        const itemIds = items.map(i => i.menu_item_id || i.id);
        const dbItems = await MenuItem.findAll({
            where: { id: { [Op.in]: itemIds }, restaurant_id: this.result.restaurantId }
        });

        const unavailableItems = dbItems.filter(i => !i.is_available);
        if (unavailableItems.length > 0 && !this.result.forceProceed) {
            const error = new Error('Some items in your cart are now Out of Order');
            error.type = 'AVAILABILITY_CONFLICT';
            error.unavailableItems = unavailableItems.map(i => ({ id: i.id, name: i.name }));
            throw error;
        }

        const validItems = items.filter(cartItem => {
            const menuItemId = cartItem.menu_item_id || cartItem.id;
            const dbItem = dbItems.find(i => i.id === menuItemId);
            return dbItem && dbItem.is_available;
        });

        if (validItems.length === 0) throw new Error('No available items to order');

        let subtotal = 0;
        const finalItems = validItems.map(cartItem => {
            const menuItemId = cartItem.menu_item_id || cartItem.id;
            const dbItem = dbItems.find(i => i.id === menuItemId);
            const qty = Number(cartItem.quantity || 0);

            if (!qty || qty <= 0) throw new Error(`Invalid quantity for item ${dbItem?.name || menuItemId}`);

            const unitPrice = Number(dbItem.price);
            const itemSubtotal = unitPrice * qty;
            subtotal += itemSubtotal;

            return {
                menu_item_id: dbItem.id,
                menu_item_name: dbItem.name,
                quantity: qty,
                unit_price: unitPrice,
                subtotal: itemSubtotal,
            };
        });

        this.result.items = validItems;
        this.result.dbItems = dbItems;
        this.result.finalOrderItems = finalItems;
        this.result.subtotal = subtotal;
        this.result.totalAmount = subtotal + this.result.deliveryFee;

        return this;
    }

    async buildPaymentInfo() {
        // Initial payment info logic. 
        // Actual session/txnRef logic happens in the Checkout director or service level.
        return this;
    }
}

module.exports = StandardCheckoutBuilder;
