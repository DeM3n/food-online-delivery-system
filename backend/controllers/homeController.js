const { MenuCategory, MenuItem, Restaurant } = require('../models');

const FALLBACK_ARTICLES = [
  {
    id: 'article-001',
    title: 'OFDS launches smarter homepage recommendations',
    slug: 'ofds-smart-homepage-recommendations',
    summary: 'Discover featured dishes and categories faster with the new OFDS homepage summary API.',
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    published_at: '2026-03-14T08:00:00.000Z',
    source: 'system'
  },
  {
    id: 'article-002',
    title: 'Top Vietnamese comfort foods to order this week',
    slug: 'top-vietnamese-comfort-foods-this-week',
    summary: 'From pho to banh mi, explore a curated list of crowd favorites on OFDS.',
    image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
    published_at: '2026-03-13T08:00:00.000Z',
    source: 'system'
  },
  {
    id: 'article-003',
    title: 'How restaurants can improve discoverability on OFDS',
    slug: 'restaurants-improve-discoverability-on-ofds',
    summary: 'Use strong category mapping, high-quality product photos, and accurate availability to rank better.',
    image_url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
    published_at: '2026-03-12T08:00:00.000Z',
    source: 'system'
  }
];

// @desc    Homepage summary
// @route   GET /api/home/summary
// @access  Public
exports.getHomeSummary = async (req, res) => {
  try {
    const [categoryRows, productRows] = await Promise.all([
      MenuCategory.findAll({
        include: [
          {
            model: MenuItem,
            attributes: ['id'],
            where: { is_available: true },
            required: false
          },
          {
            model: Restaurant,
            attributes: ['id', 'name', 'is_open', 'rating'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']]
      }),
      MenuItem.findAll({
        where: { is_available: true },
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
        limit: 12
      })
    ]);

    const featuredCategories = categoryRows
      .map((category) => {
        const itemCount = Array.isArray(category.MenuItems) ? category.MenuItems.length : 0;

        return {
          id: category.id,
          name: category.name,
          restaurant_id: category.restaurant_id,
          restaurant_name: category.Restaurant?.name || null,
          item_count: itemCount,
          is_restaurant_open: category.Restaurant?.is_open ?? null,
          restaurant_rating: category.Restaurant?.rating ?? null
        };
      })
      .sort((a, b) => {
        if (b.item_count !== a.item_count) return b.item_count - a.item_count;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);

    const featuredProducts = productRows
      .map((item) => ({
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
        category_name: item.MenuCategory?.name || null
      }))
      .sort((a, b) => {
        const ratingA = Number(a.restaurant_rating || 0);
        const ratingB = Number(b.restaurant_rating || 0);
        return ratingB - ratingA;
      })
      .slice(0, 8);

    const latestArticles = FALLBACK_ARTICLES
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 3);

    return res.status(200).json({
      success: true,
      data: {
        featured_categories: featuredCategories,
        featured_products: featuredProducts,
        latest_news_articles: latestArticles
      },
      meta: {
        articles_source: 'fallback_static',
        note: 'Current OFDS SQL schema does not have a news/articles table yet.'
      }
    });
  } catch (error) {
    console.error('Get home summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};
