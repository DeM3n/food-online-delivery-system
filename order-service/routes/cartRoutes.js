const express = require('express');
const router = express.Router();
const { getCart, addItemToCart, updateItemQuantity, removeItem, clearCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All cart routes require authentication

router.get('/', getCart);
router.post('/items', addItemToCart);
router.put('/items/:itemId', updateItemQuantity);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);

module.exports = router;
