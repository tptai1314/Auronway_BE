const express = require('express');
const router = express.Router();
const articleController = require('./article.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');

// Public routes (require auth)
router.get('/', authenticate, articleController.getArticles);
router.get('/top-news', authenticate, articleController.getTopNews);
router.get('/highlights', authenticate, articleController.getHighlights);
router.get('/trending', authenticate, articleController.getTrending);
router.get('/:idOrSlug', authenticate, articleController.getArticleDetail);

// Admin routes
router.post('/', authenticate, requireRole({ systemRoles: ['ADMIN', 'MODERATOR'] }), articleController.createArticle);
router.put('/:id', authenticate, requireRole({ systemRoles: ['ADMIN', 'MODERATOR'] }), articleController.updateArticle);
router.delete('/:id', authenticate, requireRole({ systemRoles: ['ADMIN', 'MODERATOR'] }), articleController.deleteArticle);

module.exports = router;
