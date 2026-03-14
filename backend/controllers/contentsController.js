const { Op } = require('sequelize');
const { Content } = require('../models');

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

// @desc    List published contents / news / articles
// @route   GET /api/contents
// @access  Public
exports.getContents = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limitRaw = parsePositiveInt(req.query.limit, 10);
    const limit = Math.min(limitRaw, 50);
    const offset = (page - 1) * limit;

    const keyword = (req.query.keyword || req.query.search || '').trim();
    const contentType = (req.query.content_type || '').trim().toLowerCase();

    const where = {
      status: 'published',
      published_at: {
        [Op.ne]: null
      }
    };

    if (contentType) {
      where.content_type = contentType;
    }

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { summary: { [Op.like]: `%${keyword}%` } },
        { body: { [Op.like]: `%${keyword}%` } },
        { slug: { [Op.like]: `%${keyword}%` } }
      ];
    }

    const { rows, count } = await Content.findAndCountAll({
      where,
      attributes: [
        'id',
        'title',
        'slug',
        'summary',
        'image_url',
        'content_type',
        'status',
        'published_at',
        'created_at',
        'updated_at'
      ],
      order: [
        ['published_at', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total_items: count,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1
      },
      filters: {
        keyword: keyword || null,
        content_type: contentType || null
      }
    });
  } catch (error) {
    console.error('Get contents error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_LIST_ERROR',
        message: 'Failed to retrieve published contents'
      }
    });
  }
};

// @desc    Get published visible content detail
// @route   GET /api/contents/:id
// @access  Public
exports.getContentDetail = async (req, res) => {
  try {
    const id = (req.params.id || '').trim();

    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONTENT_INVALID_ID',
          message: 'Content id is required'
        }
      });
    }

    // First check whether the content exists at all, including soft-deleted rows.
    const contentAnyStatus = await Content.findByPk(id, { paranoid: false });

    if (!contentAnyStatus) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_FOUND',
          message: 'Content not found'
        }
      });
    }

    const isSoftDeleted = !!contentAnyStatus.deleted_at;
    const isPublished = contentAnyStatus.status === 'published';
    const hasPublishedAt = !!contentAnyStatus.published_at;

    if (isSoftDeleted || !isPublished || !hasPublishedAt) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_VISIBLE',
          message: 'Content is hidden or unpublished',
          hidden: isSoftDeleted,
          unpublished: !isPublished || !hasPublishedAt
        }
      });
    }

    const content = await Content.findOne({
      where: {
        id,
        status: 'published',
        published_at: {
          [Op.ne]: null
        }
      },
      attributes: [
        'id',
        'title',
        'slug',
        'summary',
        'body',
        'image_url',
        'content_type',
        'status',
        'published_at',
        'created_at',
        'updated_at'
      ]
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTENT_NOT_VISIBLE',
          message: 'Content is hidden or unpublished'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('Get content detail error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONTENT_DETAIL_ERROR',
        message: 'Failed to retrieve content detail'
      }
    });
  }
};
