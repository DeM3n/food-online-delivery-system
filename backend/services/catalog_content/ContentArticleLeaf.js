const CatalogComponent = require('./CatalogComponent');

class ContentArticleLeaf extends CatalogComponent {
  constructor(article) {
    super();
    this.id = article.id;
    this.title = article.title;
    this.summary = article.summary || null;
    this.slug = article.slug || null;
    this.published_at = article.published_at || null;
  }

  display() {
    return {
      nodeType: 'content_article',
      id: this.id,
      title: this.title,
      summary: this.summary,
      slug: this.slug,
      published_at: this.published_at,
    };
  }
}

module.exports = ContentArticleLeaf;
