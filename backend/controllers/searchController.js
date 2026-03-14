const { Op } = require('sequelize');
const { MenuItem, MenuCategory, Restaurant, Content } = require('../models');

const parsePositiveInt = (value, fallback, max = 20) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

// @desc    Unified search across products + contents
// @route   GET /api/search?q=...
// @access  Public
exports.searchAll = async (req, res) => {
  try {
    const q = (req.query.q || req.query.keyword || '').trim();
    const productLimit = parsePositiveInt(req.query.product_limit, 8, 20);
    const contentLimit = parsePositiveInt(req.query.content_limit, 5, 20);

    if (!q) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SEARCH_INVALID_QUERY',
          message: 'Search query q is required'
        }
      });
    }

    const likeQuery = `%${q}%`;

    const [products, contents] = await Promise.all([
      MenuItem.findAll({
        where: {
          is_available: true,
          [Op.or]: [
            { name: { [Op.like]: likeQuery } },
            { description: { [Op.like]: likeQuery } }
          ]
        },
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
        include: [
          {
            model: Restaurant,
            attributes: ['id', 'name', 'rating', 'is_open']
          },
          {
            model: MenuCategory,
            attributes: ['id', 'name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: productLimit
      }),
      Content.findAll({
        where: {
          status: 'published',
          published_at: { [Op.ne]: null },
          [Op.or]: [
            { title: { [Op.like]: likeQuery } },
            { summary: { [Op.like]: likeQuery } },
            { body: { [Op.like]: likeQuery } },
            { slug: { [Op.like]: likeQuery } }
          ]
        },
        attributes: [
          'id',
          'title',
          'slug',
          'summary',
          'image_url',
          'content_type',
          'published_at',
          'created_at'
        ],
        order: [['published_at', 'DESC'], ['created_at', 'DESC']],
        limit: contentLimit
      })
    ]);

    const productResults = products.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      restaurant_id: item.restaurant_id,
      restaurant_name: item.Restaurant?.name || null,
      restaurant_rating: item.Restaurant?.rating ?? null,
      is_restaurant_open: item.Restaurant?.is_open ?? null,
      category_id: item.category_id,
      category_name: item.MenuCategory?.name || null,
      result_type: 'product'
    }));

    const contentResults = contents.map((content) => ({
      id: content.id,
      title: content.title,
      slug: content.slug,
      summary: content.summary,
      image_url: content.image_url,
      content_type: content.content_type,
      published_at: content.published_at,
      result_type: 'content'
    }));

    const totalResults = productResults.length + contentResults.length;

    return res.status(200).json({
      success: true,
      data: {
        query: q,
        products: productResults,
        contents: contentResults
      },
      meta: {
        total_results: totalResults,
        product_count: productResults.length,
        content_count: contentResults.length,
        no_results: totalResults === 0
      },
      message: totalResults === 0 ? 'No results found' : 'Search completed successfully'
    });
  } catch (error) {
    console.error('Unified search error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_SERVICE_ERROR',
        message: 'Search service is temporarily unavailable'
      }
    });
  }
};
