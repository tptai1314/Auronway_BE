const express = require("express");
const router = express.Router();

const controller = require("./skills.controller");
const { authenticate } = require("../../middlewares/auth");
const { requireRole } = require("../../middlewares/rbac");

// ===== PUBLIC ROUTES =====

// GET /api/skills/categories
router.get("/categories", controller.getCategories);

// GET /api/skills/categories/:code/skills
router.get("/categories/:code/skills", controller.getSkillsByCategory);

// GET /api/skills?category_id=&q=&status=ACTIVE
router.get("/", controller.getSkills);

// ===== USER ROUTES (ME) - Must be before /:id route =====

// GET /api/skills/me/dashboard (must be before /me/:skillId)
router.get("/me/dashboard", authenticate, controller.getSkillDashboard);

// GET /api/skills/me/balance
router.get("/me/balance", authenticate, controller.getSkillBalance);

// GET /api/skills/me/level-progress
router.get("/me/level-progress", authenticate, controller.getLevelProgress);

// PATCH /api/skills/me/focus
router.patch("/me/focus", authenticate, controller.setFocusSkill);

// GET /api/skills/me (all my skills)
router.get("/me", authenticate, controller.getMySkills);

// GET /api/skills/me/:skillId
router.get("/me/:skillId", authenticate, controller.getMySkillDetail);

// ===== DYNAMIC ROUTES (must be after specific routes) =====

// GET /api/skills/:id
router.get("/:id", controller.getSkillDetail);

// ===== ADMIN ROUTES =====

// POST /api/skills/admin/skill-categories
router.post(
  "/admin/skill-categories",
  authenticate,
  requireRole({ globalRoles: ["SUPER_ADMIN"] }),
  controller.createSkillCategory
);

// PUT /api/skills/admin/skill-categories/:id
router.put(
  "/admin/skill-categories/:id",
  authenticate,
  requireRole({ globalRoles: ["SUPER_ADMIN"] }),
  controller.updateSkillCategory
);

// POST /api/skills/admin/skills
router.post(
  "/admin/skills",
  authenticate,
  requireRole({ globalRoles: ["SUPER_ADMIN"] }),
  controller.createSkill
);

// PUT /api/skills/admin/skills/:id
router.put(
  "/admin/skills/:id",
  authenticate,
  requireRole({ globalRoles: ["SUPER_ADMIN"] }),
  controller.updateSkill
);

// PATCH /api/skills/admin/skills/:id/status
router.patch(
  "/admin/skills/:id/status",
  authenticate,
  requireRole({ globalRoles: ["SUPER_ADMIN"] }),
  controller.updateSkillStatus
);

// ===== REVIEW ROUTE =====

// POST /api/skills/apply-review
router.post(
  "/apply-review",
  authenticate,
  requireRole({ affiliationRoles: ["REVIEWER", "EVENT_MANAGER"] }),
  controller.applyReview
);

module.exports = router;
