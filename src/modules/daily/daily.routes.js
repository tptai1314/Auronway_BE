// modules/daily/daily.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./daily.controller');
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');

// ===== CHECK-IN =====
// GET /daily/check-in/status - Kiểm tra trạng thái check-in hôm nay
router.get('/check-in/status', authenticate, controller.getCheckInStatus);

// GET /daily/check-in/calendar - Lấy calendar config 30 ngày
router.get('/check-in/calendar', authenticate, controller.getCheckInCalendar);

// POST /daily/check-in - Thực hiện check-in hằng ngày
router.post('/check-in', authenticate, controller.performCheckIn);

// ===== DAILY QUEST =====
// GET /daily/quests - Lấy danh sách quest hôm nay
router.get('/quests', authenticate, controller.getUserDailyQuests);

// GET /daily/quests/history - Lấy lịch sử 7 ngày quest
router.get('/quests/history', authenticate, controller.getQuestHistory);

// POST /daily/quests/:questId/claim - Nhận thưởng quest
router.post('/quests/:questId/claim', authenticate, controller.claimQuestReward);

// ===== ADMIN: Daily Quest Management =====
// POST /daily/admin/quests - Tạo quest mới
router.post(
  '/admin/quests',
  authenticate,
  requireRole({ systemRoles: ['TENANT_ADMIN', 'SUPER_ADMIN'] }),
  controller.createDailyQuest
);

// GET /daily/admin/quests - Lấy tất cả quest
router.get(
  '/admin/quests',
  authenticate,
  requireRole({ systemRoles: ['TENANT_ADMIN', 'SUPER_ADMIN'] }),
  controller.getAllDailyQuests
);

// PATCH /daily/admin/quests/:id - Cập nhật quest
router.patch(
  '/admin/quests/:id',
  authenticate,
  requireRole({ systemRoles: ['TENANT_ADMIN', 'SUPER_ADMIN'] }),
  controller.updateDailyQuest
);

// DELETE /daily/admin/quests/:id - Xóa quest
router.delete(
  '/admin/quests/:id',
  authenticate,
  requireRole({ systemRoles: ['TENANT_ADMIN', 'SUPER_ADMIN'] }),
  controller.deleteDailyQuest
);

module.exports = router;
