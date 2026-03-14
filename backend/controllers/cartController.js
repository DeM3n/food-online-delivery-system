const {
  Cart,
  CartItem,
  MenuItem,
  Customer,
  GuestCartSession,
  GuestCartItem,
  Restaurant,
  MenuCategory
} = require('../models');

const {
  generateGuestCartToken,
  hashGuestCartToken,
  getGuestCartExpiryDate
} = require('../utils/cartToken');

// =========================
// GET ACTIVE CART
// =========================
// - Customer: lấy cart theo user -> customer_id
// - Guest: lấy cart theo x-cart-token hoặc cart_token query
// @desc    Get active cart (guest or customer)
// @route   GET /api/cart
// @access  Public
exports.getCart = async (req, res) => {
  try {
    // =========================
    // CUSTOMER CART
    // =========================
    if (req.user?.id) {
      const customer = await Customer.findOne({
        where: { user_id: req.user.id }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      let cart = await Cart.findOne({
        where: { customer_id: customer.id },
        include: [
          {
            model: CartItem,
            include: [
              {
                model: MenuItem,
                include: [
                  {
                    model: Restaurant,
                    attributes: ['id', 'name', 'is_open', 'rating'],
                    required: false
                  },
                  {
                    model: MenuCategory,
                    attributes: ['id', 'name'],
                    required: false
                  }
                ]
              }
            ]
          }
        ]
      });

      // Nếu chưa có cart thì tạo cart rỗng
      if (!cart) {
        cart = await Cart.create({
          customer_id: customer.id,
          restaurant_id: null
        });

        return res.status(200).json({
          success: true,
          data: {
            cart_type: 'customer',
            cart_id: cart.id,
            customer_id: customer.id,
            restaurant_id: null,
            items: []
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          cart_type: 'customer',
          cart_id: cart.id,
          customer_id: customer.id,
          restaurant_id: cart.restaurant_id,
          items: cart.CartItems || []
        }
      });
    }

    // =========================
    // GUEST CART
    // =========================
    const incomingCartToken =
      (req.headers['x-cart-token'] || req.query.cart_token || '').toString().trim();

    let guestCartSession = null;
    let cartToken = incomingCartToken;
    let cartRecreated = false;

    if (incomingCartToken) {
      guestCartSession = await GuestCartSession.findOne({
        where: {
          cart_token_hash: hashGuestCartToken(incomingCartToken)
        },
        include: [
          {
            model: GuestCartItem,
            include: [
              {
                model: MenuItem,
                include: [
                  {
                    model: Restaurant,
                    attributes: ['id', 'name', 'is_open', 'rating'],
                    required: false
                  },
                  {
                    model: MenuCategory,
                    attributes: ['id', 'name'],
                    required: false
                  }
                ]
              }
            ]
          }
        ]
      });

      // Token có nhưng session hết hạn => xoá session cũ và tạo lại
      if (guestCartSession && new Date(guestCartSession.expires_at) <= new Date()) {
        await guestCartSession.destroy();
        guestCartSession = null;
        cartRecreated = true;
      }
    }

    // Nếu chưa có session guest => tạo mới
    if (!guestCartSession) {
      cartToken = generateGuestCartToken();

      guestCartSession = await GuestCartSession.create({
        cart_token_hash: hashGuestCartToken(cartToken),
        expires_at: getGuestCartExpiryDate()
      });
    }

    const guestItems = guestCartSession.GuestCartItems || [];

    const restaurantId =
      guestItems.find((item) => item.MenuItem?.restaurant_id)?.MenuItem?.restaurant_id || null;

    return res.status(200).json({
      success: true,
      data: {
        cart_type: 'guest',
        guest_cart_session_id: guestCartSession.id,
        cart_token: cartToken,
        cart_token_header: 'x-cart-token',
        expires_at: guestCartSession.expires_at,
        restaurant_id: restaurantId,
        items: guestItems
      },
      meta: {
        cart_recreated: cartRecreated
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// =========================
// CUSTOMER-ONLY CART ACTIONS
// =========================

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res) => {
  try {
    const { menu_item_id, quantity, restaurant_id } = req.body;

    if (!menu_item_id || !quantity || !restaurant_id) {
      return res.status(400).json({
        success: false,
        message: 'menu_item_id, quantity and restaurant_id are required'
      });
    }

    const customer = await Customer.findOne({
      where: { user_id: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const menuItem = await MenuItem.findByPk(menu_item_id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    if (!menuItem.is_available) {
      return res.status(400).json({
        success: false,
        message: 'Menu item is unavailable'
      });
    }

    let cart = await Cart.findOne({
      where: { customer_id: customer.id }
    });

    // Nếu cart đang thuộc restaurant khác => clear item cũ và set restaurant mới
    if (!cart || (cart.restaurant_id && cart.restaurant_id !== restaurant_id)) {
      if (cart) {
        await CartItem.destroy({ where: { cart_id: cart.id } });
        cart.restaurant_id = restaurant_id;
        await cart.save();
      } else {
        cart = await Cart.create({
          customer_id: customer.id,
          restaurant_id
        });
      }
    }

    let cartItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        menu_item_id
      }
    });

    if (cartItem) {
      cartItem.quantity += Number(quantity);
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        cart_id: cart.id,
        menu_item_id,
        quantity: Number(quantity)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Item added to cart'
    });
  } catch (error) {
    console.error('Add item to cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
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
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    if (!quantity || Number(quantity) <= 0) {
      await cartItem.destroy();

      return res.status(200).json({
        success: true,
        message: 'Cart item removed'
      });
    }

    cartItem.quantity = Number(quantity);
    await cartItem.save();

    return res.status(200).json({
      success: true,
      message: 'Quantity updated'
    });
  } catch (error) {
    console.error('Update cart item quantity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeItem = async (req, res) => {
  try {
    const cartItem = await CartItem.findByPk(req.params.itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await cartItem.destroy();

    return res.status(200).json({
      success: true,
      message: 'Item removed'
    });
  } catch (error) {
    console.error('Remove cart item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      where: { user_id: req.user.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const cart = await Cart.findOne({
      where: { customer_id: customer.id }
    });

    if (cart) {
      await CartItem.destroy({
        where: { cart_id: cart.id }
      });

      cart.restaurant_id = null;
      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};