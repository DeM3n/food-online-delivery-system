const { Cart, CartItem, MenuItem, Customer } = require('../models');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        let cart = await Cart.findOne({
            where: { customer_id: customer.id },
            include: [{
                model: CartItem,
                include: [{ model: MenuItem }]
            }]
        });

        // If no cart exists, return empty structure
        if (!cart) {
            return res.json({ success: true, data: { items: [], restaurant_id: null } });
        }

        res.json({ success: true, data: cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res) => {
    try {
        const { menu_item_id, quantity, restaurant_id } = req.body;
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });
        
        let cart = await Cart.findOne({ where: { customer_id: customer.id } });

        // If no cart or changing restaurant, reset cart
        if (!cart || cart.restaurant_id !== restaurant_id) {
            if (cart) {
                // Clear items from previous restaurant
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

        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
exports.updateItemQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;
        const cartItem = await CartItem.findByPk(req.params.itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        if (quantity <= 0) {
            await cartItem.destroy();
        } else {
            cartItem.quantity = quantity;
            await cartItem.save();
        }

        res.json({ success: true, message: 'Quantity updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeItem = async (req, res) => {
    try {
        const cartItem = await CartItem.findByPk(req.params.itemId);
        if (cartItem) {
            await cartItem.destroy();
        }
        res.json({ success: true, message: 'Item removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
    try {
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });
        const cart = await Cart.findOne({ where: { customer_id: customer.id } });
        
        if (cart) {
            await CartItem.destroy({ where: { cart_id: cart.id } });
            cart.restaurant_id = null;
            await cart.save();
        }

        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
