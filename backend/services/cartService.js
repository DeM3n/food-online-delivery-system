const { Cart, CartItem, MenuItem, Customer } = require('../models');

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

        if (cartItem) {
            cartItem.quantity += quantity;
            await cartItem.save();
        } else {
            cartItem = await CartItem.create({
                cart_id: cart.id,
                menu_item_id,
                quantity
            });
        }
        return cartItem;
    }

    async updateQuantity(itemId, quantity) {
        const cartItem = await CartItem.findByPk(itemId);
        if (!cartItem) throw new Error('Cart item not found');

        if (quantity <= 0) {
            await cartItem.destroy();
        } else {
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
