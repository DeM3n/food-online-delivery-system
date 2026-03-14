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

const customerCartInclude = [
  {
    model: CartItem,
    include: [
      {
        model: MenuItem,
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
      }
    ]
  }
];

const guestCartInclude = [
  {
    model: GuestCartItem,
    include: [
      {
        model: MenuItem,
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
      }
    ]
  }
];

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const mapProductPayload = (menuItem) => {
  if (!menuItem) return null;

  return {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    image_url: menuItem.image_url,
    is_available: menuItem.is_available,
    restaurant: menuItem.Restaurant
      ? {
          id: menuItem.Restaurant.id,
          name: menuItem.Restaurant.name,
          is_open: menuItem.Restaurant.is_open,
          rating: menuItem.Restaurant.rating
        }
      : null,
    category: menuItem.MenuCategory
      ? {
          id: menuItem.MenuCategory.id,
          name: menuItem.MenuCategory.name
        }
      : null
  };
};

const buildCustomerCartDetailResponse = ({ cart, customerId = null }) => {
  const items = (cart?.CartItems || []).map((cartItem) => {
    const unitPrice = toMoney(cartItem.MenuItem?.price || 0);
    const quantity = Number(cartItem.quantity || 0);
    const itemSubtotal = toMoney(unitPrice * quantity);

    return {
      id: cartItem.id,
      cart_id: cartItem.cart_id,
      menu_item_id: cartItem.menu_item_id,
      quantity,
      unit_price: unitPrice,
      item_subtotal: itemSubtotal,
      product: mapProductPayload(cartItem.MenuItem)
    };
  });

  const cartSubtotal = toMoney(
    items.reduce((sum, item) => sum + Number(item.item_subtotal || 0), 0)
  );

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    cart_type: 'customer',
    cart_id: cart?.id || null,
    customer_id: customerId,
    restaurant_id: cart?.restaurant_id || null,
    items,
    summary: {
      item_count: items.length,
      total_quantity: totalQuantity,
      cart_subtotal: cartSubtotal,
      cart_total: cartSubtotal
    }
  };
};

const buildGuestCartDetailResponse = ({ guestCartSession, cartToken = null }) => {
  const items = (guestCartSession?.GuestCartItems || []).map((cartItem) => {
    const unitPrice = toMoney(cartItem.MenuItem?.price || 0);
    const quantity = Number(cartItem.quantity || 0);
    const itemSubtotal = toMoney(unitPrice * quantity);

    return {
      id: cartItem.id,
      guest_cart_session_id: cartItem.guest_cart_session_id,
      menu_item_id: cartItem.menu_item_id,
      quantity,
      unit_price: unitPrice,
      item_subtotal: itemSubtotal,
      product: mapProductPayload(cartItem.MenuItem)
    };
  });

  const cartSubtotal = toMoney(
    items.reduce((sum, item) => sum + Number(item.item_subtotal || 0), 0)
  );

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const restaurantId =
    items.find((item) => item.product?.restaurant?.id)?.product?.restaurant?.id || null;

  return {
    cart_type: 'guest',
    guest_cart_session_id: guestCartSession?.id || null,
    cart_token: cartToken,
    cart_token_header: 'x-cart-token',
    expires_at: guestCartSession?.expires_at || null,
    restaurant_id: restaurantId,
    items,
    summary: {
      item_count: items.length,
      total_quantity: totalQuantity,
      cart_subtotal: cartSubtotal,
      cart_total: cartSubtotal
    }
  };
};

const loadCustomerCartWithDetails = async (cartId) => {
  return Cart.findOne({
    where: { id: cartId },
    include: customerCartInclude
  });
};

const loadGuestCartSessionWithDetails = async (guestCartSessionId) => {
  return GuestCartSession.findOne({
    where: { id: guestCartSessionId },
    include: guestCartInclude
  });
};

const recalcCustomerCartResponse = async ({ cartId, customerId }) => {
  const freshCart = await loadCustomerCartWithDetails(cartId);

  return buildCustomerCartDetailResponse({
    cart: freshCart,
    customerId
  });
};

const recalcGuestCartResponse = async ({ guestCartSessionId, cartToken }) => {
  const freshSession = await loadGuestCartSessionWithDetails(guestCartSessionId);

  return buildGuestCartDetailResponse({
    guestCartSession: freshSession,
    cartToken
  });
};

const getGuestCartTokenFromRequest = (req) =>
  (req.headers['x-cart-token'] || req.query.cart_token || '').toString().trim();

const findGuestCartSessionByToken = async (cartToken) => {
  if (!cartToken) return null;

  const session = await GuestCartSession.findOne({
    where: {
      cart_token_hash: hashGuestCartToken(cartToken)
    },
    include: guestCartInclude
  });

  if (!session) return null;

  if (new Date(session.expires_at) <= new Date()) {
    await session.destroy();
    return null;
  }

  return session;
};

const getOrCreateGuestCartSession = async (req) => {
  let cartToken = getGuestCartTokenFromRequest(req);
  let guestCartSession = await findGuestCartSessionByToken(cartToken);
  let cartRecreated = false;

  if (!guestCartSession) {
    cartToken = generateGuestCartToken();

    guestCartSession = await GuestCartSession.create({
      cart_token_hash: hashGuestCartToken(cartToken),
      expires_at: getGuestCartExpiryDate()
    });

    guestCartSession = await loadGuestCartSessionWithDetails(guestCartSession.id);
    cartRecreated = true;
  }

  return {
    guestCartSession,
    cartToken,
    cartRecreated
  };
};

const requireExistingGuestCartSession = async (req) => {
  const cartToken = getGuestCartTokenFromRequest(req);

  if (!cartToken) {
    return {
      error: {
        status: 400,
        body: {
          success: false,
          message: 'Guest cart token is required'
        }
      }
    };
  }

  const guestCartSession = await findGuestCartSessionByToken(cartToken);

  if (!guestCartSession) {
    return {
      error: {
        status: 404,
        body: {
          success: false,
          message: 'Guest cart not found or expired'
        }
      }
    };
  }

  return { guestCartSession, cartToken };
};

const validateVisibleAvailableProduct = async (menuItemId) => {
  const menuItem = await MenuItem.findByPk(menuItemId, {
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
    return { error: { status: 404, message: 'Product not found' } };
  }

  if (menuItem.deleted_at) {
    return { error: { status: 404, message: 'Product is hidden' } };
  }

  if (!menuItem.is_available) {
    return { error: { status: 400, message: 'Product is unavailable' } };
  }

  return { menuItem };
};

const cartItemInclude = [
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
];



const buildCartDetailResponse = ({ cart, customerId = null }) => {
  const items = (cart?.CartItems || []).map((cartItem) => {
    const unitPrice = toMoney(cartItem.MenuItem?.price || 0);
    const quantity = Number(cartItem.quantity || 0);
    const itemSubtotal = toMoney(unitPrice * quantity);

    return {
      id: cartItem.id,
      cart_id: cartItem.cart_id,
      menu_item_id: cartItem.menu_item_id,
      quantity,
      unit_price: unitPrice,
      item_subtotal: itemSubtotal,
      product: cartItem.MenuItem
        ? {
            id: cartItem.MenuItem.id,
            name: cartItem.MenuItem.name,
            description: cartItem.MenuItem.description,
            image_url: cartItem.MenuItem.image_url,
            is_available: cartItem.MenuItem.is_available,
            restaurant: cartItem.MenuItem.Restaurant
              ? {
                  id: cartItem.MenuItem.Restaurant.id,
                  name: cartItem.MenuItem.Restaurant.name,
                  is_open: cartItem.MenuItem.Restaurant.is_open,
                  rating: cartItem.MenuItem.Restaurant.rating
                }
              : null,
            category: cartItem.MenuItem.MenuCategory
              ? {
                  id: cartItem.MenuItem.MenuCategory.id,
                  name: cartItem.MenuItem.MenuCategory.name
                }
              : null
          }
        : null
    };
  });

  const cartSubtotal = toMoney(
    items.reduce((sum, item) => sum + Number(item.item_subtotal || 0), 0)
  );

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return {
    cart_id: cart?.id || null,
    customer_id: customerId,
    restaurant_id: cart?.restaurant_id || null,
    items,
    summary: {
      item_count: items.length,
      total_quantity: totalQuantity,
      cart_subtotal: cartSubtotal,
      cart_total: cartSubtotal
    }
  };
};

const loadCartWithDetails = async (cartId) => {
  return Cart.findOne({
    where: { id: cartId },
    include: cartItemInclude
  });
};

const recalcCartResponse = async ({ cartId, customerId }) => {
  const freshCart = await loadCartWithDetails(cartId);
  return buildCartDetailResponse({
    cart: freshCart,
    customerId
  });
};




// =========================
// GET ACTIVE CART
// =========================
// @desc    Get cart details
// @route   GET /api/cart
// @access  Public
exports.getCart = async (req, res) => {
  try {
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

      const cart = await Cart.findOne({
        where: { customer_id: customer.id },
        include: customerCartInclude
      });

      if (!cart) {
        return res.status(200).json({
          success: true,
          data: {
            cart_type: 'customer',
            cart_id: null,
            customer_id: customer.id,
            restaurant_id: null,
            items: [],
            summary: {
              item_count: 0,
              total_quantity: 0,
              cart_subtotal: 0,
              cart_total: 0
            }
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: buildCustomerCartDetailResponse({
          cart,
          customerId: customer.id
        })
      });
    }

    const { guestCartSession, cartToken } = await getOrCreateGuestCartSession(req);

    return res.status(200).json({
      success: true,
      data: buildGuestCartDetailResponse({
        guestCartSession,
        cartToken
      })
    });
  } catch (error) {
    console.error('Get cart details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Public
exports.addItemToCart = async (req, res) => {
  try {
    const { menu_item_id, quantity, restaurant_id, options } = req.body;

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

    const productCheck = await validateVisibleAvailableProduct(menu_item_id);
    if (productCheck.error) {
      return res.status(productCheck.error.status).json({
        success: false,
        message: productCheck.error.message
      });
    }

    const menuItem = productCheck.menuItem;

    if (restaurant_id && restaurant_id !== menuItem.restaurant_id) {
      return res.status(400).json({
        success: false,
        message: 'restaurant_id does not match the selected product'
      });
    }

    const targetRestaurantId = menuItem.restaurant_id;

    // CUSTOMER
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

      const cartDetails = await recalcCustomerCartResponse({
        cartId: cart.id,
        customerId: customer.id
      });

      const updatedItem = cartDetails.items.find((item) => item.id === cartItem.id) || null;

      return res.status(200).json({
        success: true,
        message: 'Item added to cart',
        data: {
          action,
          updated_item: updatedItem,
          cart: cartDetails
        }
      });
    }

    // GUEST
    const {
      guestCartSession,
      cartToken
    } = await getOrCreateGuestCartSession(req);

    const currentRestaurantId =
      (guestCartSession.GuestCartItems || []).find((item) => item.MenuItem?.restaurant_id)?.MenuItem?.restaurant_id || null;

    if (currentRestaurantId && currentRestaurantId !== targetRestaurantId) {
      await GuestCartItem.destroy({
        where: { guest_cart_session_id: guestCartSession.id }
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

    const cartDetails = await recalcGuestCartResponse({
      guestCartSessionId: guestCartSession.id,
      cartToken
    });

    const updatedItem = cartDetails.items.find((item) => item.id === guestCartItem.id) || null;

    return res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: {
        action,
        updated_item: updatedItem,
        cart: cartDetails
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
// @route   PATCH /api/cart/items/:itemId
// @access  Public
exports.updateItemQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const itemId = req.params.itemId;

    if (quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({
        success: false,
        message: 'quantity is required'
      });
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity)) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be an integer'
      });
    }

    if (parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be greater than or equal to 0'
      });
    }

    if (parsedQuantity > 99) {
      return res.status(400).json({
        success: false,
        message: 'quantity is too large'
      });
    }

    // CUSTOMER
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

      const cart = await Cart.findOne({
        where: { customer_id: customer.id }
      });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      const cartItem = await CartItem.findOne({
        where: {
          id: itemId,
          cart_id: cart.id
        }
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Cart item not found'
        });
      }

      const productCheck = await validateVisibleAvailableProduct(cartItem.menu_item_id);
      if (productCheck.error) {
        return res.status(productCheck.error.status).json({
          success: false,
          message: productCheck.error.message
        });
      }

      if (parsedQuantity === 0) {
        await cartItem.destroy();

        const cartDetails = await recalcCustomerCartResponse({
          cartId: cart.id,
          customerId: customer.id
        });

        return res.status(200).json({
          success: true,
          message: 'Cart item removed',
          data: {
            updated_item: null,
            cart: cartDetails
          }
        });
      }

      cartItem.quantity = parsedQuantity;
      await cartItem.save();

      const cartDetails = await recalcCustomerCartResponse({
        cartId: cart.id,
        customerId: customer.id
      });

      const updatedItem = cartDetails.items.find((item) => item.id === cartItem.id) || null;

      return res.status(200).json({
        success: true,
        message: 'Quantity updated successfully',
        data: {
          updated_item: updatedItem,
          cart: cartDetails
        }
      });
    }

    // GUEST
    const guestLookup = await requireExistingGuestCartSession(req);
    if (guestLookup.error) {
      return res.status(guestLookup.error.status).json(guestLookup.error.body);
    }

    const { guestCartSession, cartToken } = guestLookup;

    const guestCartItem = await GuestCartItem.findOne({
      where: {
        id: itemId,
        guest_cart_session_id: guestCartSession.id
      }
    });

    if (!guestCartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    const productCheck = await validateVisibleAvailableProduct(guestCartItem.menu_item_id);
    if (productCheck.error) {
      return res.status(productCheck.error.status).json({
        success: false,
        message: productCheck.error.message
      });
    }

    if (parsedQuantity === 0) {
      await guestCartItem.destroy();

      const cartDetails = await recalcGuestCartResponse({
        guestCartSessionId: guestCartSession.id,
        cartToken
      });

      return res.status(200).json({
        success: true,
        message: 'Cart item removed',
        data: {
          updated_item: null,
          cart: cartDetails
        }
      });
    }

    guestCartItem.quantity = parsedQuantity;
    await guestCartItem.save();

    const cartDetails = await recalcGuestCartResponse({
      guestCartSessionId: guestCartSession.id,
      cartToken
    });

    const updatedItem = cartDetails.items.find((item) => item.id === guestCartItem.id) || null;

    return res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      data: {
        updated_item: updatedItem,
        cart: cartDetails
      }
    });
  } catch (error) {
    console.error('Update cart item quantity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};




// Add / replace these methods in backend/controllers/cartController.js

// @desc    Remove cart item
// @route   DELETE /api/cart/items/:itemId
// @access  Public
exports.removeItem = async (req, res) => {
  try {
    const itemId = req.params.itemId;

    // CUSTOMER
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

      const cart = await Cart.findOne({
        where: { customer_id: customer.id }
      });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      const cartItem = await CartItem.findOne({
        where: {
          id: itemId,
          cart_id: cart.id
        }
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: 'Cart item not found'
        });
      }

      await cartItem.destroy();

      const cartDetails = await recalcCustomerCartResponse({
        cartId: cart.id,
        customerId: customer.id
      });

      if ((cartDetails.items || []).length === 0 && cart.restaurant_id) {
        cart.restaurant_id = null;
        await cart.save();
        cartDetails.restaurant_id = null;
      }

      return res.status(200).json({
        success: true,
        message: 'Item removed successfully',
        data: {
          removed_item_id: itemId,
          cart: cartDetails
        }
      });
    }

    // GUEST
    const guestLookup = await requireExistingGuestCartSession(req);
    if (guestLookup.error) {
      return res.status(guestLookup.error.status).json(guestLookup.error.body);
    }

    const { guestCartSession, cartToken } = guestLookup;

    const guestCartItem = await GuestCartItem.findOne({
      where: {
        id: itemId,
        guest_cart_session_id: guestCartSession.id
      }
    });

    if (!guestCartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    await guestCartItem.destroy();

    const cartDetails = await recalcGuestCartResponse({
      guestCartSessionId: guestCartSession.id,
      cartToken
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed successfully',
      data: {
        removed_item_id: itemId,
        cart: cartDetails
      }
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
// @route   DELETE /api/cart/items
// @access  Public
exports.clearCart = async (req, res) => {
  try {
    // CUSTOMER
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

      const cart = await Cart.findOne({
        where: { customer_id: customer.id }
      });

      if (!cart) {
        return res.status(200).json({
          success: true,
          message: 'Cart already empty',
          data: {
            cart: {
              cart_type: 'customer',
              cart_id: null,
              customer_id: customer.id,
              restaurant_id: null,
              items: [],
              summary: {
                item_count: 0,
                total_quantity: 0,
                cart_subtotal: 0,
                cart_total: 0
              }
            }
          }
        });
      }

      await CartItem.destroy({
        where: { cart_id: cart.id }
      });

      cart.restaurant_id = null;
      await cart.save();

      const cartDetails = await recalcCustomerCartResponse({
        cartId: cart.id,
        customerId: customer.id
      });

      return res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: {
          cart: cartDetails
        }
      });
    }

    // GUEST
    const guestLookup = await requireExistingGuestCartSession(req);
    if (guestLookup.error) {
      return res.status(200).json({
        success: true,
        message: 'Cart already empty',
        data: {
          cart: {
            cart_type: 'guest',
            guest_cart_session_id: null,
            cart_token: getGuestCartTokenFromRequest(req) || null,
            cart_token_header: 'x-cart-token',
            expires_at: null,
            restaurant_id: null,
            items: [],
            summary: {
              item_count: 0,
              total_quantity: 0,
              cart_subtotal: 0,
              cart_total: 0
            }
          }
        }
      });
    }

    const { guestCartSession, cartToken } = guestLookup;

    await GuestCartItem.destroy({
      where: { guest_cart_session_id: guestCartSession.id }
    });

    const cartDetails = await recalcGuestCartResponse({
      guestCartSessionId: guestCartSession.id,
      cartToken
    });

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: cartDetails
      }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};