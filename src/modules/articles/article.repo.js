const Article = require('../../model/article.model');

async function createArticle(data) {
  const article = new Article(data);
  return article.save();
}

async function findArticleById(id) {
  return Article.findById(id).populate('author_id', 'name avatar');
}

async function findArticleBySlug(slug, tenantId) {
  return Article.findOne({ slug, tenant_id: tenantId, is_active: true })
    .populate('author_id', 'name avatar');
}

async function findArticles(filter = {}, options = {}) {
  const { page = 1, limit = 10, sort = { published_at: -1 } } = options;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Article.find(filter)
      .populate('author_id', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Article.countDocuments(filter)
  ]);

  return {
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}

async function updateArticle(id, data) {
  return Article.findByIdAndUpdate(id, data, { new: true });
}

async function deleteArticle(id) {
  return Article.findByIdAndUpdate(id, { is_active: false }, { new: true });
}

async function incrementViewCount(id) {
  return Article.findByIdAndUpdate(
    id,
    { $inc: { view_count: 1 } },
    { new: true }
  );
}

module.exports = {
  createArticle,
  findArticleById,
  findArticleBySlug,
  findArticles,
  updateArticle,
  deleteArticle,
  incrementViewCount
};
