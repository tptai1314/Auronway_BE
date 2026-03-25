const articleService = require('./article.service');

// GET /api/articles
const getArticles = async (req, res, next) => {
  try {
    const { category, search, page, limit } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    };

    const result = await articleService.getArticles(req.user, filters, options);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/articles/top-news
const getTopNews = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await articleService.getTopNews(req.user, parseInt(limit) || 5);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/articles/highlights
const getHighlights = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await articleService.getHighlights(req.user, parseInt(limit) || 5);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/articles/trending
const getTrending = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await articleService.getTrending(req.user, parseInt(limit) || 10);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/articles/:idOrSlug
const getArticleDetail = async (req, res, next) => {
  try {
    const article = await articleService.getArticleDetail(req.user, req.params.idOrSlug);

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// Admin routes

// POST /api/articles
const createArticle = async (req, res, next) => {
  try {
    const article = await articleService.createArticle(req.user, req.body);

    res.status(201).json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/articles/:id
const updateArticle = async (req, res, next) => {
  try {
    const article = await articleService.updateArticle(req.user, req.params.id, req.body);

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/articles/:id
const deleteArticle = async (req, res, next) => {
  try {
    await articleService.deleteArticle(req.user, req.params.id);

    res.json({
      success: true,
      message: 'Xóa tin tức thành công'
    });
  } catch (error) {
    next(error);
  }
};

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
