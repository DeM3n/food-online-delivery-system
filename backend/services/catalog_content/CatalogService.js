const { MenuItem, MenuCategory, Restaurant } = require('../../models');
const { Op } = require('sequelize');
const MenuCategoryComposite = require('./MenuCategoryComposite');
const MenuItemLeaf = require('./MenuItemLeaf');
const ContentArticleLeaf = require('./ContentArticleLeaf');
const { getPublishedArticles } = require('./contentArticleProvider');

class CatalogService {
  normalizeQuery(query = {}) {
    const keyword = String(query.keyword || '').trim();
    const restaurant_id = query.restaurant_id || null;
    const category_id = query.category_id || null;
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit, 10) || 12, 1);
    const sort = query.sort || 'newest';

    return {
      keyword,
      restaurant_id,
      category_id,
      page,
      limit,
      sort,
    };
  }

  buildOrder(sort) {
    if (sort === 'price_asc') return [['price', 'ASC']];
    if (sort === 'price_desc') return [['price', 'DESC']];
    if (sort === 'name_asc') return [['name', 'ASC']];
    if (sort === 'name_desc') return [['name', 'DESC']];
    return [['created_at', 'DESC']];
  }

  buildMenuWhere(filters) {
    const where = { is_available: true };

    if (filters.restaurant_id) {
      where.restaurant_id = filters.restaurant_id;
    }

    if (filters.category_id) {
      where.category_id = filters.category_id;
    }

    if (filters.keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.keyword}%` } },
        { description: { [Op.like]: `%${filters.keyword}%` } },
      ];
    }

    return where;
  }

  async fetchMenuItems(filters) {
    const offset = (filters.page - 1) * filters.limit;

    return MenuItem.findAndCountAll({
      where: this.buildMenuWhere(filters),
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
      order: this.buildOrder(filters.sort),
      limit: filters.limit,
      offset,
    });
  }

  buildCompositeTree(menuItems, contentArticles = []) {
    const root = new MenuCategoryComposite({
      id: 'catalog-root',
      name: 'Catalog Root',
    });

    const categoryMap = new Map();

    for (const item of menuItems) {
      const categoryId = item.MenuCategory?.id || 'uncategorized';
      const categoryName = item.MenuCategory?.name || 'Uncategorized';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(
          categoryId,
          new MenuCategoryComposite({
            id: categoryId,
            name: categoryName,
          })
        );
      }

      categoryMap.get(categoryId).add(new MenuItemLeaf(item));
    }

    for (const category of categoryMap.values()) {
      root.add(category);
    }

    if (contentArticles.length > 0) {
      const contentRoot = new MenuCategoryComposite({
        id: 'content-articles',
        name: 'Content & Articles',
      });

      for (const article of contentArticles) {
        contentRoot.add(new ContentArticleLeaf(article));
      }

      root.add(contentRoot);
    }

    return root.display();
  }

  async browseCatalog(query = {}) {
    const filters = this.normalizeQuery(query);
    const { count, rows } = await this.fetchMenuItems(filters);
    const articles = getPublishedArticles('');
    const composite = this.buildCompositeTree(rows, articles);

    return {
      items: rows,
      articles,
      composite,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalItems: count,
        totalPages: Math.ceil(count / filters.limit),
      },
      filters,
    };
  }

  async searchCatalog(query = {}) {
    const filters = this.normalizeQuery(query);
    const { count, rows } = await this.fetchMenuItems(filters);
    const articles = getPublishedArticles(filters.keyword);
    const composite = this.buildCompositeTree(rows, articles);

    return {
      items: rows,
      articles,
      composite,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalItems: count,
        totalPages: Math.ceil(count / filters.limit),
      },
      filters,
    };
  }

  async getProductDetail(itemId) {
    return MenuItem.findOne({
      where: {
        id: itemId,
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
  }
}

module.exports = new CatalogService();
