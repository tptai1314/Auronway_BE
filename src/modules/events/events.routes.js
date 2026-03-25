
const express = require("express");
const router = express.Router();

const controller = require("./events.controller");
const { authenticate } = require("../../middlewares/auth");
const { requireRole, authorizeEventManagerOfEvent } = require("../../middlewares/rbac");
const authorizeRegistration = require("../../middlewares/authorizeRegistration");

// =========================
// EVENTS CRUD
// =========================

// Tạo event
router.post(
  "/",
  authenticate,
  requireRole({
    systemRoles: ["TENANT_ADMIN"],
    affiliationRoles: ["EVENT_MANAGER", "CLUB_ADMIN"],
  }),
  controller.createEvent
);

// Lấy danh sách event
router.get("/", authenticate, controller.getEvents);

// Lấy chi tiết event
router.get("/:id", authenticate, controller.getEventDetail);

// Cập nhật event
router.patch(
  "/:id",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.updateEvent
);

// Hủy event
router.delete(
  "/:id",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.cancelEvent
);

// =========================
// EVENT REGISTRATION
// =========================

// Lấy tất cả events đã đăng ký (My Events) - MUST BE BEFORE /:id routes
router.get(
  "/me/events",
  authenticate,
  controller.getMyEvents
);

// Đăng ký event
router.post(
  "/:id/register",
  authenticate,
  authorizeRegistration,
  controller.registerEvent
);

// Hủy đăng ký (user tự hủy)
router.delete(
  "/:id/register",
  authenticate,
  controller.cancelRegistration
);

// Lấy đăng ký của chính user
router.get(
  "/:id/my-registration",
  authenticate,
  controller.getMyRegistration
);

// Danh sách đăng ký (EVENT_MANAGER quản lý sự kiện)
router.get(
  "/:id/registrations",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.getEventRegistrations
);

// =========================
// CHECK-IN
// =========================

// Check-in event (manual)
router.post(
  "/:id/checkin",
  authenticate,
  controller.checkinEvent
);

// =========================
// QR CODE CHECK-IN
// =========================

// Tạo QR code cho event (chỉ EVENT_MANAGER)
router.post(
  "/:id/qr-code",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.generateEventQRCode
);

// Lấy thông tin QR code (chỉ EVENT_MANAGER)
router.get(
  "/:id/qr-code",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.getEventQRCode
);

// Vô hiệu hóa QR code (chỉ EVENT_MANAGER)
router.delete(
  "/:id/qr-code",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.deactivateEventQRCode
);

// Xóa hoàn toàn QR code (chỉ EVENT_MANAGER)
router.delete(
  "/:id/qr-code/delete",
  authenticate,
  authorizeEventManagerOfEvent,
  controller.deleteEventQRCode
);

// Check-in bằng QR code (user quét QR)
router.post(
  "/qr-checkin",
  authenticate,
  controller.checkinByQRCode
);

module.exports = router;
