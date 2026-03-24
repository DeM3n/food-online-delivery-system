/**
 * Demo content source for the Catalog & Content subsystem.
 *
 * The current backend snippets do not include a ContentArticle Sequelize model,
 * so this provider supplies a small in-memory set of published articles to let
 * the Composite structure match the report design.
 *
 * Replace this file with DB access later if you add a real `content_article`
 * table/model.
 */
const CONTENT_ARTICLES = [
  {
    id: 'article-safe-ordering',
    title: 'Cách đặt món nhanh vào giờ cao điểm',
    summary: 'Một số mẹo để chọn món, kiểm tra trạng thái nhà hàng và giảm thời gian chờ.',
    slug: 'cach-dat-mon-nhanh-vao-gio-cao-diem',
    published_at: '2026-03-01T09:00:00.000Z',
  },
  {
    id: 'article-food-safety',
    title: 'Gợi ý kiểm tra thông tin món ăn và độ sẵn sàng',
    summary: 'Xem mô tả món, giá, tình trạng available và tình trạng mở cửa của nhà hàng trước khi thêm vào giỏ.',
    slug: 'goi-y-kiem-tra-thong-tin-mon-an-va-do-san-sang',
    published_at: '2026-03-05T09:00:00.000Z',
  },
  {
    id: 'article-tracking',
    title: 'Theo dõi đơn hàng hiệu quả sau khi checkout',
    summary: 'Tận dụng timeline trạng thái và thông báo để theo dõi quá trình chuẩn bị và giao hàng.',
    slug: 'theo-doi-don-hang-hieu-qua-sau-khi-checkout',
    published_at: '2026-03-10T09:00:00.000Z',
  },
];

function getPublishedArticles(keyword = '') {
  const normalizedKeyword = String(keyword || '').trim().toLowerCase();

  if (!normalizedKeyword) {
    return CONTENT_ARTICLES;
  }

  return CONTENT_ARTICLES.filter((article) => {
    const haystack = `${article.title} ${article.summary || ''}`.toLowerCase();
    return haystack.includes(normalizedKeyword);
  });
}

module.exports = {
  getPublishedArticles,
};
