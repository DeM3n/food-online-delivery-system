const catalogService = require('../services/catalog_content/CatalogService');

/**
 * CatalogController
 *
 * Refactored to use the Catalog & Content Composite subsystem.
 * This now delegates browse/search logic to CatalogService, which builds a
 * composite tree of MenuCategory (composite), MenuItem (leaf), and
 * ContentArticle (leaf).
 */
exports.browseCatalog = async (req, res) => {
  try {
    const result = await catalogService.browseCatalog(req.query);

    res.json({
      success: true,
      data: result.items,
      articles: result.articles,
      composite: result.composite,
      pagination: result.pagination,
      filters: result.filters,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

exports.searchCatalog = async (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim();

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: 'keyword is required for catalog search',
      });
    }

    const result = await catalogService.searchCatalog(req.query);

    res.json({
      success: true,
      data: result.items,
      articles: result.articles,
      composite: result.composite,
      pagination: result.pagination,
      filters: result.filters,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const item = await catalogService.getProductDetail(req.params.itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
