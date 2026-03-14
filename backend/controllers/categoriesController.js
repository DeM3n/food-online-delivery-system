const { Op } = require('sequelize');
const { MenuCategory, MenuItem, Restaurant } = require('../models');

// @desc    List categories / browse by category with basic filters
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const restaurantId = (req.query.restaurant_id || '').trim();
    const categoryId = (req.query.category_id || '').trim();
    const keyword = (req.query.keyword || '').trim();
    const includeItems = ['1', 'true', 'yes'].includes(String(req.query.include_items || '').toLowerCase());

    const categoryWhere = {};

    if (restaurantId) {
      categoryWhere.restaurant_id = restaurantId;
    }

    if (categoryId) {
      categoryWhere.id = categoryId;
    }

    const categories = await MenuCategory.findAll({
      where: categoryWhere,
      include: [
        {
          model: Restaurant,
          attributes: ['id', 'name', 'is_open', 'rating'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (!categories.length) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: {
          total: 0,
          filters: {
            restaurant_id: restaurantId || null,
            category_id: categoryId || null,
            keyword: keyword || null,
            include_items: includeItems
          }
        }
      });
    }

    const categoryIds = categories.map((category) => category.id);

    const itemWhere = {
      category_id: { [Op.in]: categoryIds },
      is_available: true
    };

    if (keyword) {
      itemWhere[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const items = await MenuItem.findAll({
      where: itemWhere,
      attributes: [
        'id',
        'name',
        'description',
        'price',
        'image_url',
        'restaurant_id',
        'category_id',
        'is_available',
        'created_at'
      ],
      order: [['created_at', 'DESC']]
    });

    const itemsByCategory = items.reduce((acc, item) => {
      if (!acc[item.category_id]) acc[item.category_id] = [];
      acc[item.category_id].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image_url: item.image_url,
        restaurant_id: item.restaurant_id,
        category_id: item.category_id,
        is_available: item.is_available,
        created_at: item.created_at
      });
      return acc;
    }, {});

    const loweredKeyword = keyword.toLowerCase();

    const result = categories
      .filter((category) => {
        if (!keyword) return true;

        const categoryNameMatch = category.name.toLowerCase().includes(loweredKeyword);
        const itemMatch = (itemsByCategory[category.id] || []).length > 0;

        return categoryNameMatch || itemMatch;
      })
      .map((category) => {
        const categoryItems = itemsByCategory[category.id] || [];
        const payload = {
          id: category.id,
          name: category.name,
          restaurant_id: category.restaurant_id,
          restaurant_name: category.Restaurant?.name || null,
          restaurant_rating: category.Restaurant?.rating ?? null,
          is_restaurant_open: category.Restaurant?.is_open ?? null,
          item_count: categoryItems.length
        };

        if (includeItems || categoryId) {
          payload.items = categoryItems;
        }

        return payload;
      })
      .sort((a, b) => {
        if (b.item_count !== a.item_count) return b.item_count - a.item_count;
        return a.name.localeCompare(b.name);
      });

    return res.status(200).json({
      success: true,
      data: result,
      meta: {
        total: result.length,
        filters: {
          restaurant_id: restaurantId || null,
          category_id: categoryId || null,
          keyword: keyword || null,
          include_items: includeItems
        }
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
