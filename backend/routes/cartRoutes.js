const express = require('express');
const router = express.Router();

const {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  clearCart
} = require('../controllers/cartController');

const { protect } = require('../middleware/authMiddleware');
const { optionalProtect } = require('../middleware/cartOptionalAuth');

// Public create/get active cart
// - Guest: x-cart-token hoặc cart_token query
// - Customer: Bearer token
router.get('/', optionalProtect, getCart);

// Customer-only cart mutations
router.post('/items', protect, addItemToCart);
router.put('/items/:itemId', protect, updateItemQuantity);
router.delete('/items/:itemId', protect, removeItem);
router.delete('/', protect, clearCart);

module.exports = router;