const { Cart, CartItem, MenuItem, Customer, Restaurant } = require('../models');

class CartService {
    async getCart(userId) {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        let cart = await Cart.findOne({
            where: { customer_id: customer.id },
            include: [{
                model: CartItem,
                include: [{ model: MenuItem }]
            }]
        });

        if (!cart) {
            return { items: [], restaurant_id: null };
        }

        return cart;
    }

    async addItem(userId, itemData) {
        const { menu_item_id, quantity, restaurant_id } = itemData;
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        if (!restaurant_id) throw new Error('restaurant_id is required');
        if (!menu_item_id) throw new Error('menu_item_id is required');
        if (!quantity || Number(quantity) <= 0) throw new Error('quantity must be greater than 0');

        const restaurant = await Restaurant.findByPk(restaurant_id);
        if (!restaurant) throw new Error('Restaurant not found');
        if (!restaurant.is_open) {
            const error = new Error('Restaurant is currently closed');
            error.type = 'RESTAURANT_CLOSED';
            throw error;
        }

        const menuItem = await MenuItem.findByPk(menu_item_id);
        if (!menuItem) throw new Error('Menu item not found');
        if (String(menuItem.restaurant_id) !== String(restaurant_id)) {
            throw new Error('Menu item does not belong to this restaurant');
        }
        if (!menuItem.is_available) {
            throw new Error('Menu item is currently unavailable');
        }
        
        let cart = await Cart.findOne({ where: { customer_id: customer.id } });

        if (!cart || cart.restaurant_id !== restaurant_id) {
            if (cart) {
                await CartItem.destroy({ where: { cart_id: cart.id } });
                cart.restaurant_id = restaurant_id;
                await cart.save();
            } else {
                cart = await Cart.create({ customer_id: customer.id, restaurant_id });
            }
        }

        let cartItem = await CartItem.findOne({ 
            where: { cart_id: cart.id, menu_item_id } 
        });

        const MAX_QUANTITY = 20;

        if (cartItem) {
            const newQuantity = cartItem.quantity + Number(quantity);
            if (newQuantity > MAX_QUANTITY) {
                throw new Error(`Maximum quantity per item is ${MAX_QUANTITY}`);
            }
            cartItem.quantity = newQuantity;
            await cartItem.save();
        } else {
            if (Number(quantity) > MAX_QUANTITY) {
                throw new Error(`Maximum quantity per item is ${MAX_QUANTITY}`);
            }
            cartItem = await CartItem.create({
                cart_id: cart.id,
                menu_item_id,
                quantity: Number(quantity)
            });
        }
        return cartItem;
    }

    async updateQuantity(itemId, quantity) {
        const MAX_QUANTITY = 20;
        const cartItem = await CartItem.findByPk(itemId);
        if (!cartItem) throw new Error('Cart item not found');

        if (quantity <= 0) {
            await cartItem.destroy();
        } else {
            if (quantity > MAX_QUANTITY) {
                throw new Error(`Maximum quantity per item is ${MAX_QUANTITY}`);
            }
            cartItem.quantity = quantity;
            await cartItem.save();
        }
        return cartItem;
    }

    async removeItem(itemId) {
        const cartItem = await CartItem.findByPk(itemId);
        if (cartItem) {
            await cartItem.destroy();
        }
    }

    async clearCart(userId) {
        const customer = await Customer.findOne({ where: { user_id: userId } });
        if (!customer) throw new Error('Customer not found');

        const cart = await Cart.findOne({ where: { customer_id: customer.id } });
        if (cart) {
            await CartItem.destroy({ where: { cart_id: cart.id } });
            cart.restaurant_id = null;
            await cart.save();
        }
    }
}

module.exports = new CartService();
