const articleRepo = require('./article.repo');

// Lấy danh sách articles
async function getArticles(user, filters = {}, options = {}) {
  const query = {
    tenant_id: user.tenant_id,
    status: 'PUBLISHED',
    is_active: true,
    ...filters
  };

  // Chỉ lấy published articles (published_at <= now)
  query.published_at = { $lte: new Date() };

  return articleRepo.findArticles(query, options);
}

// Lấy top news
async function getTopNews(user, limit = 5) {
  const query = {
    tenant_id: user.tenant_id,
    category: 'TOP_NEWS',
    status: 'PUBLISHED',
    is_active: true,
    published_at: { $lte: new Date() }
  };

  return articleRepo.findArticles(query, {
    limit,
    sort: { featured_order: 1, published_at: -1 }
  });
}

// Lấy highlights
async function getHighlights(user, limit = 5) {
  const query = {
    tenant_id: user.tenant_id,
    category: 'HIGHLIGHTS',
    status: 'PUBLISHED',
    is_active: true,
    published_at: { $lte: new Date() }
  };

  return articleRepo.findArticles(query, {
    limit,
    sort: { featured_order: 1, published_at: -1 }
  });
}

// Lấy trending
async function getTrending(user, limit = 10) {
  const query = {
    tenant_id: user.tenant_id,
    is_trending: true,
    status: 'PUBLISHED',
    is_active: true,
    published_at: { $lte: new Date() }
  };

  return articleRepo.findArticles(query, {
    limit,
    sort: { view_count: -1, published_at: -1 }
  });
}

// Lấy chi tiết article
async function getArticleDetail(user, idOrSlug) {
  let article;
  
  // Try by ID first
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    article = await articleRepo.findArticleById(idOrSlug);
  } else {
    // Try by slug
    article = await articleRepo.findArticleBySlug(idOrSlug, user.tenant_id);
  }

  if (!article || !article.is_active) {
    const error = new Error('Tin tức không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (article.tenant_id.toString() !== user.tenant_id.toString()) {
    const error = new Error('Không có quyền truy cập');
    error.statusCode = 403;
    throw error;
  }

  // Increment view count
  await articleRepo.incrementViewCount(article._id);

  return article;
}

// Admin: Tạo article
async function createArticle(user, data) {
  // Generate slug from title
  if (!data.slug) {
    data.slug = data.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Add timestamp if published
  if (data.status === 'PUBLISHED' && !data.published_at) {
    data.published_at = new Date();
  }

  return articleRepo.createArticle({
    ...data,
    tenant_id: user.tenant_id,
    author_id: user._id
  });
}

// Admin: Cập nhật article
async function updateArticle(user, articleId, data) {
  const article = await articleRepo.findArticleById(articleId);
  
  if (!article) {
    const error = new Error('Tin tức không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (article.tenant_id.toString() !== user.tenant_id.toString()) {
    const error = new Error('Không có quyền');
    error.statusCode = 403;
    throw error;
  }

  // Update published_at if status changes to PUBLISHED
  if (data.status === 'PUBLISHED' && article.status !== 'PUBLISHED' && !data.published_at) {
    data.published_at = new Date();
  }

  return articleRepo.updateArticle(articleId, data);
}

// Admin: Xóa article
async function deleteArticle(user, articleId) {
  const article = await articleRepo.findArticleById(articleId);
  
  if (!article) {
    const error = new Error('Tin tức không tồn tại');
    error.statusCode = 404;
    throw error;
  }

  if (article.tenant_id.toString() !== user.tenant_id.toString()) {
    const error = new Error('Không có quyền');
    error.statusCode = 403;
    throw error;
  }

  return articleRepo.deleteArticle(articleId);
}

module.exports = {
  getArticles,
  getTopNews,
  getHighlights,
  getTrending,
  getArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle
};
