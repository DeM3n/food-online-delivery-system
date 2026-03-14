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
 *     description: Validates product visibility and availability, validates quantity, then adds a new item or increments quantity in the authenticated customer's cart.
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
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               restaurant_id:
 *                 type: string
 *                 nullable: true
 *                 example: 550e8400-e29b-41d4-a716-446655440001
 *               options:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid input, unavailable product, hidden product, or invalid quantity
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer or product not found
 */
// Add item
router.post('/items', protect, addItemToCart);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   put:
 *     tags:
 *       - Cart
 *     summary: Update cart item quantity
 *     description: Updates cart item quantity directly. Supports increasing, decreasing, direct quantity input, and removing the item when quantity is set to 0.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item id
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
 *       400:
 *         description: Invalid quantity or unavailable product
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer, cart, cart item, or product not found
 *       500:
 *         description: Server error
 */
// Update item quantity: PATCH
router.put('/items/:itemId', protect, updateItemQuantity);

/**
 * @openapi
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Remove item from cart
 *     description: Removes a cart item from the authenticated customer's cart.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart item id
 *     responses:
 *       200:
 *         description: Item removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Server error
 */
// Remove item
router.delete('/items/:itemId', protect, removeItem);

/**
 * @openapi
 * /api/cart:
 *   delete:
 *     tags:
 *       - Cart
 *     summary: Clear cart
 *     description: Removes all items from the authenticated customer's cart and resets restaurant binding.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */
// Clear cart
router.delete('/', protect, clearCart);

module.exports = router;
