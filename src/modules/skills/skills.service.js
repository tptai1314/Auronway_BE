const SkillCategory = require("../../model/skillCategory.model");
const Skill = require("../../model/skill.model");
const UserSkill = require("../../model/userSkill.model");
const UserSkillCategory = require("../../model/userSkillCategory.model");
const { calculateLevelFromXp, scoreToXp } = require("./skill.constants");

// Helper lỗi
function throwError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

// Lấy toàn bộ category
async function getCategories() {
  return SkillCategory.find().sort({ code: 1 });
}

// Lấy skill con theo category code
async function getSkillsByCategoryCode(categoryCode) {
  const category = await SkillCategory.findOne({ code: categoryCode });
  if (!category) throwError("Skill category not found", 404);
  const skills = await Skill.find({
    category_id: category._id,
    is_active: true,
  }).sort({
    code: 1,
  });
  return { category, skills };
}

// Lấy hồ sơ kỹ năng mềm của user
async function getUserSkills(userId) {
  const [categories, userSkills, userCat] = await Promise.all([
    SkillCategory.find(),
    UserSkill.find({ user_id: userId }).populate({
      path: "skill_id",
    }),
    UserSkillCategory.find({ user_id: userId }),
  ]);

  const catMap = {};
  categories.forEach((c) => {
    catMap[c._id.toString()] = {
      category_id: c._id,
      category_code: c.code,
      category_name: c.name,
      level_index: 1,
      level_code: "BEGINNER",
      total_xp: 0,
      skills: [],
    };
  });

  userCat.forEach((uc) => {
    const key = uc.category_id.toString();
    if (!catMap[key]) return;
    catMap[key].level_index = uc.level_index;
    catMap[key].level_code = uc.level_code;
    catMap[key].total_xp = uc.total_xp;
  });

  userSkills.forEach((us) => {
    const skill = us.skill_id;
    if (!skill) return;
    const catId = skill.category_id.toString();
    if (!catMap[catId]) return;
    catMap[catId].skills.push({
      skill_id: skill._id,
      skill_code: skill.code,
      skill_name: skill.name,
      skill_description: skill.description,
      label_vi: skill.label_vi,
      icon_url: skill.icon_url,
      total_xp: us.total_xp,
      level_index: us.level_index,
      level_code: us.level_code,
      progress: us.progress,
    });
  });

  return Object.values(catMap);
}

// Áp dụng review: cộng XP theo scores skill_code + score
// payload: { userId, eventId?, scores: [{ skill_code, score }] }
async function applyReview(payload) {
  const { userId, scores } = payload;
  if (!userId) throwError("Missing userId", 422);
  if (!Array.isArray(scores) || scores.length === 0) {
    throwError("Scores is required", 422);
  }

  // Load tất cả skill theo code
  const skillCodes = scores.map((s) => s.skill_code);
  const skills = await Skill.find({
    code: { $in: skillCodes },
    is_active: true,
  });
  const skillMap = {};
  skills.forEach((s) => {
    skillMap[s.code] = s;
  });

  // Cộng XP từng skill con
  const categoryXpDelta = {}; // category_id → xp tăng
  const updatedUserSkills = [];

  for (const { skill_code, score } of scores) {
    const skill = skillMap[skill_code];
    if (!skill) {
      // Có thể bỏ qua hoặc throw
      continue;
    }

    const xpGain = scoreToXp(score);
    if (xpGain <= 0) continue;

    let userSkill = await UserSkill.findOne({
      user_id: userId,
      skill_id: skill._id,
    });

    if (!userSkill) {
      userSkill = new UserSkill({
        user_id: userId,
        skill_id: skill._id,
        total_xp: 0,
      });
    }

    userSkill.total_xp += xpGain;
    const levelInfo = calculateLevelFromXp(userSkill.total_xp);
    userSkill.level_index = levelInfo.level_index;
    userSkill.level_code = levelInfo.level_code;
    userSkill.progress = levelInfo.progress;
    await userSkill.save();

    updatedUserSkills.push(userSkill);

    const catKey = skill.category_id.toString();
    categoryXpDelta[catKey] = (categoryXpDelta[catKey] || 0) + xpGain;
  }

  // Update UserSkillCategory (level nhóm 4C)
  const updatedCategories = [];
  for (const [categoryId, xpDelta] of Object.entries(categoryXpDelta)) {
    let userCat = await UserSkillCategory.findOne({
      user_id: userId,
      category_id: categoryId,
    });

    const oldLevel = userCat ? userCat.level_index : 1;
    const oldXp = userCat ? userCat.total_xp : 0;
    const newTotalXp = oldXp + xpDelta;

    const levelInfo = calculateLevelFromXp(newTotalXp);

    if (!userCat) {
      userCat = new UserSkillCategory({
        user_id: userId,
        category_id: categoryId,
        total_xp: newTotalXp,
        level_index: levelInfo.level_index,
        level_code: levelInfo.level_code,
      });
    } else {
      userCat.total_xp = newTotalXp;
      userCat.level_index = levelInfo.level_index;
      userCat.level_code = levelInfo.level_code;
    }

    await userCat.save();
    updatedCategories.push(userCat);

    // Nếu cần, gọi hook cấp certificate khi lên level mới
    if (levelInfo.level_index > oldLevel) {
      // TODO: integrate với Certificate System thực tế của bạn
      // await issueSkillCategoryCertificate(userId, userCat);
      // tạm thời chỉ log
      console.log(
        `[Skill] User ${userId} lên level ${levelInfo.level_code} cho category ${categoryId}`
      );
    }
  }

  return {
    updatedUserSkills,
    updatedCategories,
  };
}

module.exports = {
  // Public
  getCategories,
  getSkillsByCategoryCode,
  getSkills,
  getSkillDetail,
  
  // User
  getUserSkills,
  getUserSkillDetail,
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

// ======================================
// PUBLIC ENDPOINTS
// ======================================

// GET /api/skills?category_id=&q=&status=ACTIVE
async function getSkills(query) {
  const filter = {};
  
  if (query.category_id) {
    filter.category_id = query.category_id;
  }
  
  if (query.status) {
    filter.is_active = query.status === 'ACTIVE';
  } else {
    filter.is_active = true; // Default: only active
  }
  
  if (query.q) {
    filter.$or = [
      { name: { $regex: query.q, $options: 'i' } },
      { code: { $regex: query.q, $options: 'i' } },
      { description: { $regex: query.q, $options: 'i' } },
    ];
  }
  
  return await Skill.find(filter)
    .populate('category_id', 'code name')
    .sort({ code: 1 })
    .lean();
}

// GET /api/skills/:skillId
async function getSkillDetail(skillId) {
  const skill = await Skill.findById(skillId)
    .populate('category_id', 'code name icon')
    .lean();
  
  if (!skill) throwError('Skill không tồn tại', 404);
  return skill;
}

// ======================================
// USER ENDPOINTS
// ======================================

// GET /api/me/skills/:skillId
async function getUserSkillDetail(userId, skillId) {
  const skill = await Skill.findById(skillId);
  if (!skill) throwError('Skill không tồn tại', 404);
  
  const userSkill = await UserSkill.findOne({
    user_id: userId,
    skill_id: skillId,
  }).lean();
  
  if (!userSkill) {
    // Chưa có XP cho skill này
    return {
      skill: {
        _id: skill._id,
        code: skill.code,
        name: skill.name,
        description: skill.description,
        icon_url: skill.icon_url,
      },
      total_xp: 0,
      level_index: 1,
      level_code: 'BEGINNER',
      progress: 0,
      is_focused: false,
    };
  }
  
  return {
    skill: {
      _id: skill._id,
      code: skill.code,
      name: skill.name,
      description: skill.description,
      icon_url: skill.icon_url,
    },
    ...userSkill,
  };
}

// PATCH /api/me/skills/focus
async function setFocusSkill(userId, skillId) {
  // Reset all focused skills
  await UserSkill.updateMany(
    { user_id: userId },
    { $set: { is_focused: false } }
  );
  
  if (skillId) {
    // Set new focus
    const userSkill = await UserSkill.findOneAndUpdate(
      { user_id: userId, skill_id: skillId },
      { $set: { is_focused: true } },
      { new: true, upsert: true }
    );
    
    return userSkill;
  }
  
  return { message: 'Đã bỏ focus tất cả skills' };
}

// GET /api/me/skill-balance?range=all
async function getSkillBalance(userId, range = 'all') {
  const categories = await SkillCategory.find().sort({ code: 1 });
  const userCategories = await UserSkillCategory.find({ user_id: userId });
  
  const catMap = {};
  userCategories.forEach(uc => {
    catMap[uc.category_id.toString()] = uc;
  });
  
  // Normalize to 0-100 scale
  const maxXP = 10000; // Define max XP for normalization
  
  const balance = categories.map(cat => {
    const userCat = catMap[cat._id.toString()];
    const xp = userCat ? userCat.total_xp : 0;
    const normalized = Math.min(100, Math.round((xp / maxXP) * 100));
    
    return {
      category_code: cat.code,
      category_name: cat.name,
      total_xp: xp,
      level_index: userCat ? userCat.level_index : 1,
      level_code: userCat ? userCat.level_code : 'BEGINNER',
      normalized_score: normalized,
    };
  });
  
  return balance;
}

// GET /api/me/level-progress
async function getLevelProgress(userId) {
  const userCategories = await UserSkillCategory.find({ user_id: userId })
    .populate('category_id', 'code name')
    .lean();
  
  return userCategories.map(uc => {
    const levelInfo = calculateLevelFromXp(uc.total_xp);
    return {
      category: uc.category_id,
      level_index: uc.level_index,
      level_code: uc.level_code,
      total_xp: uc.total_xp,
      progress: levelInfo.progress,
      xp_for_next_level: levelInfo.xp_for_next_level,
    };
  });
}

// GET /api/me/skill-dashboard (Tổng hợp)
async function getSkillDashboard(userId) {
  // 1. Profile (total level/xp)
  const userCategories = await UserSkillCategory.find({ user_id: userId });
  const totalXP = userCategories.reduce((sum, uc) => sum + uc.total_xp, 0);
  const avgLevel = userCategories.length > 0
    ? Math.round(userCategories.reduce((sum, uc) => sum + uc.level_index, 0) / userCategories.length)
    : 1;
  
  // 2. Radar (skill balance)
  const balance = await getSkillBalance(userId);
  
  // 3. Next milestone
  const sortedCats = [...userCategories].sort((a, b) => {
    const aInfo = calculateLevelFromXp(a.total_xp);
    const bInfo = calculateLevelFromXp(b.total_xp);
    return (100 - aInfo.progress) - (100 - bInfo.progress);
  });
  
  const nextMilestone = sortedCats.length > 0
    ? await SkillCategory.findById(sortedCats[0].category_id).lean()
    : null;
  
  // 4. Verified skills (skills with level >= 3)
  const verifiedSkills = await UserSkill.find({
    user_id: userId,
    level_index: { $gte: 3 },
  })
    .populate('skill_id', 'code name icon_url')
    .limit(10)
    .lean();
  
  return {
    profile: {
      total_xp: totalXP,
      average_level: avgLevel,
      categories_count: userCategories.length,
    },
    radar: balance,
    next_milestone: nextMilestone ? {
      category: nextMilestone,
      current_xp: sortedCats[0].total_xp,
      next_level_xp: calculateLevelFromXp(sortedCats[0].total_xp).xp_for_next_level,
      progress: calculateLevelFromXp(sortedCats[0].total_xp).progress,
    } : null,
    verified_skills: verifiedSkills.map(us => ({
      skill: us.skill_id,
      level_index: us.level_index,
      level_code: us.level_code,
      total_xp: us.total_xp,
    })),
  };
}

// ======================================
// ADMIN CRUD
// ======================================

// POST /api/admin/skill-categories
async function createSkillCategory(data) {
  const category = new SkillCategory(data);
  await category.save();
  return category;
}

// PUT /api/admin/skill-categories/:id
async function updateSkillCategory(id, data) {
  const category = await SkillCategory.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  );
  
  if (!category) throwError('Category không tồn tại', 404);
  return category;
}

// POST /api/admin/skills
async function createSkill(data) {
  const skill = new Skill(data);
  await skill.save();
  return skill;
}

// PUT /api/admin/skills/:id
async function updateSkill(id, data) {
  const skill = await Skill.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  );
  
  if (!skill) throwError('Skill không tồn tại', 404);
  return skill;
}

// PATCH /api/admin/skills/:id/status
async function updateSkillStatus(id, isActive) {
  const skill = await Skill.findByIdAndUpdate(
    id,
    { $set: { is_active: isActive } },
    { new: true }
  );
  
  if (!skill) throwError('Skill không tồn tại', 404);
  return skill;
}
