const { MenuItem, MenuCategory, Restaurant } = require('../models');
const { Op } = require('sequelize');

/**
 * CatalogController
 *
 * Customer-facing catalog controller used by the Customer Web/App Facade.
 * This focuses on UC-R02 Browse/Search Products & Content for the existing
 * OFDS backend scope. It currently covers product/menu browsing.
 *
 * NOTE:
 * - The report mentions product/content/news browsing.
 * - This implementation covers menu/product catalog only because the current
 *   backend snippets provided do not include a news/content module.
 */
exports.browseCatalog = async (req, res) => {
  try {
    const {
      keyword = '',
      restaurant_id,
      category_id,
      page = 1,
      limit = 12,
      sort = 'newest',
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 12, 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const where = {
      is_available: true,
    };

    if (restaurant_id) {
      where.restaurant_id = restaurant_id;
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (keyword && keyword.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword.trim()}%` } },
        { description: { [Op.like]: `%${keyword.trim()}%` } },
      ];
    }

    let order = [['created_at', 'DESC']];
    if (sort === 'price_asc') order = [['price', 'ASC']];
    if (sort === 'price_desc') order = [['price', 'DESC']];
    if (sort === 'name_asc') order = [['name', 'ASC']];
    if (sort === 'name_desc') order = [['name', 'DESC']];

    const { count, rows } = await MenuItem.findAndCountAll({
      where,
      include: [
        {
          model: Restaurant,
          attributes: ['id', 'name', 'location', 'cuisine_type', 'is_open'],
          where: { is_open: true },
          required: true,
        },
        {
          model: MenuCategory,
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order,
      limit: parsedLimit,
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems: count,
        totalPages: Math.ceil(count / parsedLimit),
      },
      filters: {
        keyword,
        restaurant_id: restaurant_id || null,
        category_id: category_id || null,
        sort,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const item = await MenuItem.findOne({
      where: {
        id: req.params.itemId,
        is_available: true,
      },
      include: [
        {
          model: Restaurant,
          attributes: ['id', 'name', 'location', 'cuisine_type', 'is_open'],
          required: false,
        },
        {
          model: MenuCategory,
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
