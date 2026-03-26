const express = require("express");
const router = express.Router();
const controller = require("./admin.controller");
const { authenticate } = require("../../middlewares/auth");
const { upload } = require("../../middlewares/upload");
const { requireRole, requireAdminOrOrganizerManager } = require("../../middlewares/rbac");

// Health check
router.get("/_health", (_req, res) => res.json({ module: "admin", ok: true }));

// All admin routes require authentication and admin role OR organizer manager
// Cho phép: SUPER_ADMIN, TENANT_ADMIN, CAMPUS_ADMIN, hoặc Manager CLB
const adminAuth = [
  authenticate,
  requireAdminOrOrganizerManager,
];

// =====================================
// DASHBOARD
// =====================================
router.get("/stats", adminAuth, controller.getDashboardStats);

// =====================================
// UPLOAD
// =====================================
router.post("/upload-image", adminAuth, upload.single("image"), controller.uploadImage);

// =====================================
// SKILLS
// =====================================
router.get("/skills", adminAuth, controller.getAllSkills);

// =====================================
// AVATAR MANAGEMENT
// =====================================
router.get("/avatars", adminAuth, controller.getAvatars);
router.post("/avatars", adminAuth, controller.createAvatar);
router.patch("/avatars/:id", adminAuth, controller.updateAvatar);
router.delete("/avatars/:id", adminAuth, controller.deleteAvatar);

// =====================================
// USER MANAGEMENT
// =====================================
router.get("/users", adminAuth, controller.getUsers);
router.get("/users/:id", adminAuth, controller.getUserById);
router.post("/users", adminAuth, controller.createUser);
router.patch("/users/:id", adminAuth, controller.updateUser);
router.patch("/users/:id/status", adminAuth, controller.toggleUserStatus);
router.delete("/users/:id", adminAuth, controller.deleteUser);

// =====================================
// EVENT MANAGEMENT
// =====================================
router.get("/events", adminAuth, controller.getAllEvents);
router.patch("/events/:id/status", adminAuth, controller.updateEventStatus);
router.delete("/events/:id", adminAuth, controller.deleteEvent);

module.exports = router;
