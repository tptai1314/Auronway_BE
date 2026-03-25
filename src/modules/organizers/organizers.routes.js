const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const organizersController = require('./organizers.controller');

// POST /organizers - Admin tạo organizer (CAMPUS_ADMIN có thể tạo CLB trong campus của mình)
router.post('/', authenticate, requireRole({ systemRoles: ['TENANT_ADMIN', 'CAMPUS_ADMIN'] }), organizersController.createOrganizer);

// GET /organizers?tenantId=... - Lấy danh sách organizer theo tenant
router.get('/', organizersController.getOrganizers);

// GET /organizers/me - Lấy danh sách organizer của user hiện tại (PHẢI ĐẶT TRƯỚC /:id)
router.get('/me', require('../../middlewares/auth').authenticate, organizersController.getMyOrganizers);

// GET /organizers/:id - Lấy chi tiết organizer
router.get('/:id', organizersController.getOrganizerDetail);

// PATCH /organizers/:id - Cập nhật thông tin organizer
router.patch('/:id', organizersController.updateOrganizer);

// DELETE /organizers/:id - Disable organizer
router.delete('/:id', organizersController.disableOrganizer);

// PATCH /organizers/:id/reviewers - Cập nhật reviewer list
router.patch('/:id/reviewers', organizersController.updateReviewers);

// PATCH /organizers/:id/approvers - Cập nhật approver list
router.patch('/:id/approvers', organizersController.updateApprovers);

// GET /organizers/:id/events - Lấy danh sách event thuộc organizer
router.get('/:id/events', organizersController.getOrganizerEvents);

// POST /organizers/:id/members - Thêm thành viên vào organizer
router.post('/:id/members', organizersController.addMember);

// ==========================================
// ORGANIZER AUTHENTICATION ROUTES
// ==========================================

// POST /organizers/:id/account - Campus Admin tạo tài khoản cho CLB
router.post(
  '/:id/account',
  authenticate,
  requireRole({ systemRoles: ['CAMPUS_ADMIN', 'TENANT_ADMIN', 'SUPER_ADMIN'] }),
  organizersController.createOrganizerAccount
);

// POST /organizers/login - CLB đăng nhập
router.post('/auth/login', organizersController.loginOrganizer);

// PUT /organizers/password - CLB đổi mật khẩu
router.put(
  '/auth/password',
  authenticate, // Cần implement middleware authenticate cho organizer
  organizersController.changeOrganizerPassword
);

// ==========================================
// MEMBER MANAGEMENT ROUTES
// ==========================================

// GET /organizers/:id/members - Lấy danh sách thành viên
router.get('/:id/members', authenticate, organizersController.getOrganizerMembers);

// POST /organizers/:id/members/add - Thêm thành viên
router.post(
  '/:id/members/add',
  authenticate,
  organizersController.addOrganizerMember
);

// DELETE /organizers/:id/members/:userId - Xóa thành viên
router.delete(
  '/:id/members/:userId',
  authenticate,
  organizersController.removeOrganizerMember
);

// PATCH /organizers/:id/privacy - Cập nhật chế độ riêng tư
router.patch(
  '/:id/privacy',
  authenticate,
  organizersController.updateOrganizerPrivacy
);

module.exports = router;
