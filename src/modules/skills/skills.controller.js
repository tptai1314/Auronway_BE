const service = require("./skills.service");

// GET /skills/categories
async function getCategories(req, res, next) {
  try {
    const categories = await service.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

// GET /skills/categories/:code/skills
async function getSkillsByCategory(req, res, next) {
  try {
    const { code } = req.params;
    const result = await service.getSkillsByCategoryCode(code);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /skills/me
async function getMySkills(req, res, next) {
  try {
    const userId = req.user._id;
    const data = await service.getUserSkills(userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// POST /skills/apply-review
async function applyReview(req, res, next) {
  try {
    const payload = {
      userId: req.body.user_id || req.body.userId, // hoặc lấy từ body
      eventId: req.body.event_id,
      scores: req.body.scores || [],
    };
    const result = await service.applyReview(payload);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // Public
  getCategories,
  getSkillsByCategory,
  getSkills,
  getSkillDetail,
  
  // User
  getMySkills,
  getMySkillDetail,
  setFocusSkill,
  getSkillBalance,
  getLevelProgress,
  getSkillDashboard,
  
  // Admin
  createSkillCategory,
  updateSkillCategory,
  createSkill,
  updateSkill,
  updateSkillStatus,
  
  // Review
  applyReview,
};

// ===== PUBLIC ENDPOINTS =====

// GET /skills
async function getSkills(req, res, next) {
  try {
    const skills = await service.getSkills(req.query);
    res.json({ success: true, data: skills });
  } catch (err) {
    next(err);
  }
}

// GET /skills/:id
async function getSkillDetail(req, res, next) {
  try {
    const skill = await service.getSkillDetail(req.params.id);
    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
}

// ===== USER ENDPOINTS =====

// GET /me/skills/:skillId
async function getMySkillDetail(req, res, next) {
  try {
    const data = await service.getUserSkillDetail(
      req.user._id,
      req.params.skillId
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// PATCH /me/skills/focus
async function setFocusSkill(req, res, next) {
  try {
    const result = await service.setFocusSkill(
      req.user._id,
      req.body.skill_id
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /me/skill-balance
async function getSkillBalance(req, res, next) {
  try {
    const balance = await service.getSkillBalance(
      req.user._id,
      req.query.range
    );
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
}

// GET /me/level-progress
async function getLevelProgress(req, res, next) {
  try {
    const progress = await service.getLevelProgress(req.user._id);
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
}

// GET /me/skill-dashboard
async function getSkillDashboard(req, res, next) {
  try {
    const dashboard = await service.getSkillDashboard(req.user._id);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    next(err);
  }
}

// ===== ADMIN ENDPOINTS =====

// POST /admin/skill-categories
async function createSkillCategory(req, res, next) {
  try {
    const category = await service.createSkillCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

// PUT /admin/skill-categories/:id
async function updateSkillCategory(req, res, next) {
  try {
    const category = await service.updateSkillCategory(
      req.params.id,
      req.body
    );
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

// POST /admin/skills
async function createSkill(req, res, next) {
  try {
    const skill = await service.createSkill(req.body);
    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
}

// PUT /admin/skills/:id
async function updateSkill(req, res, next) {
  try {
    const skill = await service.updateSkill(req.params.id, req.body);
    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/skills/:id/status
async function updateSkillStatus(req, res, next) {
  try {
    const skill = await service.updateSkillStatus(
      req.params.id,
      req.body.is_active
    );
    res.json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
}
