const { Op } = require('sequelize');
const { MenuItem, Restaurant, MenuCategory, Content } = require('../models');
const { successResponse, emptyResponse, errorResponse } = require('../utils/publicDataResponse');
const { writePublicDataLog } = require('../utils/publicDataLog');

const parsePositiveInt = (value, fallback, max = 20) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown';

// @desc    Unified search suggestions for public FE
// @route   GET /api/search/suggestions?q=...
// @access  Public
exports.getSearchSuggestions = async (req, res) => {
  const q = (req.query.q || req.query.keyword || '').trim();
  const limit = parsePositiveInt(req.query.limit, 8, 20);

  const contractMeta = {
    contract: {
      request_key: 'search-suggestions',
      debounce_ms: 300,
      min_query_length: 1,
      transport: 'GET',
      query_param: 'q',
      response_shape: {
        success: 'boolean',
        data: {
          query: 'string',
          suggestions: 'array'
        },
        meta: 'object',
        state: 'object',
        message: 'string'
      }
    }
  };

  try {
    if (!q) {
      return emptyResponse(
        res,
        {
          query: '',
          suggestions: []
        },
        {
          ...contractMeta,
          total: 0,
          empty_reason: 'missing_query'
        },
        'No suggestions'
      );
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
        attributes: ['id', 'name', 'description', 'image_url', 'restaurant_id', 'category_id', 'created_at'],
        include: [
          { model: Restaurant, attributes: ['id', 'name', 'is_open'], required: false },
          { model: MenuCategory, attributes: ['id', 'name'], required: false }
        ],
        order: [['created_at', 'DESC']],
        limit
      }),
      Content.findAll({
        where: {
          status: 'published',
          published_at: { [Op.ne]: null },
          [Op.or]: [
            { title: { [Op.like]: likeQuery } },
            { summary: { [Op.like]: likeQuery } },
            { slug: { [Op.like]: likeQuery } }
          ]
        },
        attributes: ['id', 'title', 'slug', 'summary', 'image_url', 'content_type', 'published_at', 'created_at'],
        order: [['published_at', 'DESC'], ['created_at', 'DESC']],
        limit
      })
    ]);

    const productSuggestions = products.map((item) => ({
      id: item.id,
      label: item.name,
      subtitle: item.Restaurant?.name || item.MenuCategory?.name || null,
      image_url: item.image_url,
      target_type: 'product',
      target_id: item.id,
      restaurant_id: item.restaurant_id,
      category_id: item.category_id
    }));

    const contentSuggestions = contents.map((content) => ({
      id: content.id,
      label: content.title,
      subtitle: content.content_type,
      image_url: content.image_url,
      target_type: 'content',
      target_id: content.id,
      slug: content.slug
    }));

    const suggestions = [...productSuggestions, ...contentSuggestions]
      .slice(0, limit);

    if (suggestions.length === 0) {
      return emptyResponse(
        res,
        {
          query: q,
          suggestions: []
        },
        {
          ...contractMeta,
          total: 0,
          empty_reason: 'no_match'
        },
        'No suggestions found'
      );
    }

    return successResponse(
      res,
      {
        query: q,
        suggestions
      },
      {
        ...contractMeta,
        total: suggestions.length,
        product_count: productSuggestions.length,
        content_count: contentSuggestions.length
      },
      'Suggestions retrieved successfully'
    );
  } catch (error) {
    console.error('Search suggestions error:', error);

    await writePublicDataLog({
      source: 'search_suggestions',
      status: 'error',
      pathName: req.originalUrl,
      query: q || null,
      ip: getClientIp(req),
      metadata: {
        message: error.message,
        name: error.name
      }
    });

    return errorResponse(
      res,
      'SEARCH_SUGGESTIONS_ERROR',
      'Failed to retrieve search suggestions',
      500
    );
  }
};
