const express = require('express');
const router = express.Router();
const controller = require('./history.controller');
const { authenticate } = require('../../middlewares/auth');

// GET /history/tasks - Lấy lịch sử tất cả tasks
router.get('/tasks', authenticate, controller.getHistoryTasks);

module.exports = router;

