const { Op } = require('sequelize');
const { MenuItem, MenuCategory, Restaurant } = require('../models');
const { writeProductRetrievalLog } = require('../utils/productLog');

const ALLOWED_SORT_FIELDS = ['name', 'price', 'latest'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

const buildOrder = (sortBy = 'latest', sortOrder = 'desc') => {
  const field = ALLOWED_SORT_FIELDS.includes(String(sortBy).toLowerCase())
    ? String(sortBy).toLowerCase()
    : 'latest';

  const direction = ALLOWED_SORT_ORDERS.includes(String(sortOrder).toLowerCase())
    ? String(sortOrder).toUpperCase()
    : 'DESC';

  switch (field) {
    case 'name':
      return [['name', direction]];
    case 'price':
      return [['price', direction]];
    case 'latest':
    default:
      return [['created_at', direction]];
  }
};

const toPositiveInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip ||
  null;

// @desc    Product catalog
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.get('user-agent') || null;

  try {
    const page = toPositiveInt(req.query.page, 1);
    const limitRaw = toPositiveInt(req.query.limit, 12);
    const limit = Math.min(limitRaw, 50);
    const offset = (page - 1) * limit;

    const productId = (req.query.product_id || '').trim();
    const restaurantId = (req.query.restaurant_id || '').trim();
    const categoryId = (req.query.category_id || '').trim();
    const keyword = (req.query.keyword || '').trim();
    const minPrice = req.query.min_price !== undefined ? Number(req.query.min_price) : null;
    const maxPrice = req.query.max_price !== undefined ? Number(req.query.max_price) : null;
    const sortBy = (req.query.sort_by || 'latest').trim().toLowerCase();
    const sortOrder = (req.query.sort_order || 'desc').trim().toLowerCase();

    const where = {
      is_available: true
    };

    if (restaurantId) where.restaurant_id = restaurantId;
    if (categoryId) where.category_id = categoryId;

    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      where.price = {};
      if (Number.isFinite(minPrice)) where.price[Op.gte] = minPrice;
      if (Number.isFinite(maxPrice)) where.price[Op.lte] = maxPrice;
    }

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const include = [
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
    ];

    // Specific product browse mode
    if (productId) {
      const visibleProduct = await MenuItem.findOne({
        where: {
          ...where,
          id: productId
        },
        include
      });

      if (visibleProduct) {
        return res.status(200).json({
          success: true,
          data: {
            id: visibleProduct.id,
            name: visibleProduct.name,
            description: visibleProduct.description,
            price: visibleProduct.price,
            image_url: visibleProduct.image_url,
            is_available: visibleProduct.is_available,
            restaurant_id: visibleProduct.restaurant_id,
            restaurant_name: visibleProduct.Restaurant?.name || null,
            restaurant_rating: visibleProduct.Restaurant?.rating ?? null,
            is_restaurant_open: visibleProduct.Restaurant?.is_open ?? null,
            category_id: visibleProduct.category_id,
            category_name: visibleProduct.MenuCategory?.name || null,
            created_at: visibleProduct.created_at,
            updated_at: visibleProduct.updated_at
          },
          meta: {
            mode: 'single'
          }
        });
      }

      // Check if product exists but is hidden/unavailable
      const hiddenOrUnavailable = await MenuItem.findByPk(productId, {
        paranoid: false,
        include
      });

      if (hiddenOrUnavailable) {
        const isDeleted = !!hiddenOrUnavailable.deleted_at;
        const isUnavailable = !hiddenOrUnavailable.is_available;

        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_VISIBLE',
            message: 'Product is hidden or unavailable',
            hidden: isDeleted,
            unavailable: isUnavailable
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    const { count, rows } = await MenuItem.findAndCountAll({
      where,
      include,
      order: buildOrder(sortBy, sortOrder),
      limit,
      offset,
      distinct: true
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return res.status(200).json({
      success: true,
      data: rows.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        is_available: item.is_available,
        restaurant_id: item.restaurant_id,
        restaurant_name: item.Restaurant?.name || null,
        restaurant_rating: item.Restaurant?.rating ?? null,
        is_restaurant_open: item.Restaurant?.is_open ?? null,
        category_id: item.category_id,
        category_name: item.MenuCategory?.name || null,
        created_at: item.created_at,
        updated_at: item.updated_at
      })),
      meta: {
        mode: 'list',
        pagination: {
          page,
          limit,
          total_items: count,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        },
        filters: {
          restaurant_id: restaurantId || null,
          category_id: categoryId || null,
          keyword: keyword || null,
          min_price: Number.isFinite(minPrice) ? minPrice : null,
          max_price: Number.isFinite(maxPrice) ? maxPrice : null
        },
        sort: {
          sort_by: ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'latest',
          sort_order: ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc'
        },
        visibility_rule: 'Only items with is_available=true and not soft-deleted are returned.'
      }
    });
  } catch (error) {
    await writeProductRetrievalLog({
      status: 'error',
      path: req.originalUrl,
      ip,
      userAgent,
      message: error.message,
      metadata: {
        query: req.query
      }
    });

    console.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_RETRIEVAL_ERROR',
        message: 'Failed to retrieve product catalog'
      }
    });
  }
};
