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

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags:
 *       - Cart
 *     summary: Get active cart
 *     description: Returns the active cart for a guest or authenticated customer. Guest cart can be resolved by x-cart-token or cart_token query, customer cart by bearer token.
 *     parameters:
 *       - in: header
 *         name: x-cart-token
 *         schema:
 *           type: string
 *         required: false
 *         description: Guest cart token
 *       - in: query
 *         name: cart_token
 *         schema:
 *           type: string
 *         required: false
 *         description: Guest cart token as query fallback
 *     responses:
 *       200:
 *         description: Active cart retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', optionalProtect, getCart);

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     tags:
 *       - Cart
 *     summary: Add item to cart
 *     description: Adds an item to the authenticated customer's cart.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - menu_item_id
 *               - quantity
 *             properties:
 *               menu_item_id:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               restaurant_id:
 *                 type: string
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Item added to cart
 *       400:
 *         description: Invalid input or unavailable item
 *       401:
 *         description: Unauthorized
 */
router.post('/items', protect, addItemToCart);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   put:
 *     tags:
 *       - Cart
 *     summary: Update cart item quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Quantity updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.put('/items/:itemId', protect, updateItemQuantity);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Remove item from cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
router.delete('/items/:itemId', protect, removeItem);

/**
 * @openapi
 * /api/cart:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Clear cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/', protect, clearCart);

module.exports = router;
