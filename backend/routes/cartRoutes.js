const express = require('express');
const router = express.Router();

const {
  getCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  clearCart
} = require('../controllers/cartController');

const { optionalProtect } = require('../middleware/cartOptionalAuth');

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags:
 *       - Cart
 *     summary: Get active cart / cart details
 *     description: Returns the active cart for guest or authenticated customer.
 *     parameters:
 *       - in: header
 *         name: x-cart-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token
 *       - in: query
 *         name: cart_token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token as query fallback
 *     responses:
 *       200:
 *         description: Cart details retrieved successfully
 */
router.get('/', optionalProtect, getCart);

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     tags:
 *       - Cart
 *     summary: Add item to cart
 *     description: Adds item to guest or customer cart and recalculates totals.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-cart-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token
 *     responses:
 *       200:
 *         description: Item added successfully
 */
router.post('/items', optionalProtect, addItemToCart);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   patch:
 *     tags:
 *       - Cart
 *     summary: Update cart item quantity
 *     description: Updates quantity for guest or customer cart and recalculates totals.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-cart-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token
 *     responses:
 *       200:
 *         description: Quantity updated successfully
 */
router.patch('/items/:itemId', optionalProtect, updateItemQuantity);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Remove cart item
 *     description: Removes item from guest or customer cart and recalculates totals.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-cart-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token
 *     responses:
 *       200:
 *         description: Item removed successfully
 */
router.delete('/items/:itemId', optionalProtect, removeItem);

/**
 * @openapi
 * /api/cart/items:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Clear cart
 *     description: Clears guest or customer cart and recalculates totals.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-cart-token
 *         required: false
 *         schema:
 *           type: string
 *         description: Guest cart token
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 */
router.delete('/items', optionalProtect, clearCart);

// backward-compatible alias
router.delete('/', optionalProtect, clearCart);

module.exports = router;