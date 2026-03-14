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

const getOrCreateGuestCartSession = async (req) => {
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
              paranoid: false
            }
          ]
        }
      ]
    });

    if (guestCartSession && new Date(guestCartSession.expires_at) <= new Date()) {
      await guestCartSession.destroy();
      guestCartSession = null;
      cartRecreated = true;
    }
  }

  if (!guestCartSession) {
    cartToken = generateGuestCartToken();

    guestCartSession = await GuestCartSession.create({
      cart_token_hash: hashGuestCartToken(cartToken),
      expires_at: getGuestCartExpiryDate()
    });
  }

  return {
    guestCartSession,
    cartToken,
    cartRecreated
  };
};

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

// @desc    Add item to cart (guest or customer)
// @route   POST /api/cart/items
// @access  Public
exports.addItemToCart = async (req, res) => {
  try {
    const { menu_item_id, quantity, restaurant_id, options } = req.body;

    // =========================
    // VALIDATE INPUT
    // =========================
    if (!menu_item_id) {
      return res.status(400).json({
        success: false,
        message: 'menu_item_id is required'
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be a positive integer'
      });
    }

    if (parsedQuantity > 99) {
      return res.status(400).json({
        success: false,
        message: 'quantity is too large'
      });
    }

    const hasUnsupportedOptions =
      options !== undefined &&
      options !== null &&
      !(
        (typeof options === 'string' && options.trim() === '') ||
        (Array.isArray(options) && options.length === 0) ||
        (typeof options === 'object' && !Array.isArray(options) && Object.keys(options).length === 0)
      );

    if (hasUnsupportedOptions) {
      return res.status(400).json({
        success: false,
        message: 'Product options are not supported in the current cart schema'
      });
    }

    // =========================
    // VALIDATE PRODUCT EXISTS + VISIBLE
    // =========================
    const menuItem = await MenuItem.findByPk(menu_item_id, {
      paranoid: false,
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
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // hidden = soft deleted
    if (menuItem.deleted_at) {
      return res.status(404).json({
        success: false,
        message: 'Product is hidden'
      });
    }

    // unavailable
    if (!menuItem.is_available) {
      return res.status(400).json({
        success: false,
        message: 'Product is unavailable'
      });
    }

    // restaurant check
    if (restaurant_id && restaurant_id !== menuItem.restaurant_id) {
      return res.status(400).json({
        success: false,
        message: 'restaurant_id does not match the selected product'
      });
    }

    const targetRestaurantId = menuItem.restaurant_id;

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
        where: { customer_id: customer.id }
      });

      if (!cart) {
        cart = await Cart.create({
          customer_id: customer.id,
          restaurant_id: targetRestaurantId
        });
      }

      // one-restaurant-per-cart rule
      if (cart.restaurant_id && cart.restaurant_id !== targetRestaurantId) {
        await CartItem.destroy({
          where: { cart_id: cart.id }
        });

        cart.restaurant_id = targetRestaurantId;
        await cart.save();
      }

      if (!cart.restaurant_id) {
        cart.restaurant_id = targetRestaurantId;
        await cart.save();
      }

      let cartItem = await CartItem.findOne({
        where: {
          cart_id: cart.id,
          menu_item_id
        }
      });

      let action = 'created';

      if (cartItem) {
        cartItem.quantity += parsedQuantity;
        await cartItem.save();
        action = 'incremented';
      } else {
        cartItem = await CartItem.create({
          cart_id: cart.id,
          menu_item_id,
          quantity: parsedQuantity
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Item added to cart',
        data: {
          cart_type: 'customer',
          cart_id: cart.id,
          customer_id: customer.id,
          restaurant_id: cart.restaurant_id,
          action,
          item: {
            id: cartItem.id,
            menu_item_id: cartItem.menu_item_id,
            quantity: cartItem.quantity
          },
          product: {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            image_url: menuItem.image_url,
            restaurant_name: menuItem.Restaurant?.name || null,
            category_name: menuItem.MenuCategory?.name || null
          }
        }
      });
    }

    // =========================
    // GUEST CART
    // =========================
    const {
      guestCartSession,
      cartToken,
      cartRecreated
    } = await getOrCreateGuestCartSession(req);

    const currentGuestItems = guestCartSession.GuestCartItems || [];
    const currentRestaurantId =
      currentGuestItems.find((item) => item.MenuItem?.restaurant_id)?.MenuItem?.restaurant_id || null;

    // one-restaurant-per-cart rule for guest
    if (currentRestaurantId && currentRestaurantId !== targetRestaurantId) {
      await GuestCartItem.destroy({
        where: {
          guest_cart_session_id: guestCartSession.id
        }
      });
    }

    let guestCartItem = await GuestCartItem.findOne({
      where: {
        guest_cart_session_id: guestCartSession.id,
        menu_item_id
      }
    });

    let action = 'created';

    if (guestCartItem) {
      guestCartItem.quantity += parsedQuantity;
      await guestCartItem.save();
      action = 'incremented';
    } else {
      guestCartItem = await GuestCartItem.create({
        guest_cart_session_id: guestCartSession.id,
        menu_item_id,
        quantity: parsedQuantity
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: {
        cart_type: 'guest',
        guest_cart_session_id: guestCartSession.id,
        cart_token: cartToken,
        cart_token_header: 'x-cart-token',
        expires_at: guestCartSession.expires_at,
        restaurant_id: targetRestaurantId,
        action,
        item: {
          id: guestCartItem.id,
          menu_item_id: guestCartItem.menu_item_id,
          quantity: guestCartItem.quantity
        },
        product: {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          image_url: menuItem.image_url,
          restaurant_name: menuItem.Restaurant?.name || null,
          category_name: menuItem.MenuCategory?.name || null
        }
      },
      meta: {
        cart_recreated: cartRecreated
      }
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