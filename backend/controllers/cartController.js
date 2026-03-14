const cartService = require('../services/cartService');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        const cart = await cartService.getCart(req.user.id);
        res.json({ success: true, data: cart });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res) => {
    try {
        await cartService.addItem(req.user.id, req.body);
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
        await cartService.updateQuantity(req.params.itemId, quantity);
        res.json({ success: true, message: 'Quantity updated' });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeItem = async (req, res) => {
    try {
        await cartService.removeItem(req.params.itemId);
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
        await cartService.clearCart(req.user.id);
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
