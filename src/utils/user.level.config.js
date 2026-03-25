// Cấu hình level tổng của user (có thể chỉnh sửa theo nhu cầu)
const USER_LEVEL_CONFIG = [
  { level: 1, xp_required: 0 },
  { level: 2, xp_required: 100 },
  { level: 3, xp_required: 250 },
  { level: 4, xp_required: 450 },
  { level: 5, xp_required: 700 },
  { level: 6, xp_required: 1000 },
  { level: 7, xp_required: 1350 },
  { level: 8, xp_required: 1750 },
  { level: 9, xp_required: 2200 },
  { level: 10, xp_required: 2700 },
  { level: 11, xp_required: 3250 },
  { level: 12, xp_required: 3850 },
  { level: 13, xp_required: 4500 },
  { level: 14, xp_required: 5200 },
  { level: 15, xp_required: 5950 },
  { level: 16, xp_required: 6750 },
  { level: 17, xp_required: 7600 },
  { level: 18, xp_required: 8500 },
  { level: 19, xp_required: 9450 },
  { level: 20, xp_required: 10450 },
  { level: 21, xp_required: 11500 },
  { level: 22, xp_required: 12600 },
  { level: 23, xp_required: 13750 },
  { level: 24, xp_required: 14950 },
  { level: 25, xp_required: 16200 },
  { level: 26, xp_required: 17500 },
  { level: 27, xp_required: 18850 },
  { level: 28, xp_required: 20250 },
  { level: 29, xp_required: 21700 },
  { level: 30, xp_required: 23200 },
  { level: 31, xp_required: 24750 },
  { level: 32, xp_required: 26350 },
  { level: 33, xp_required: 28000 },
  { level: 34, xp_required: 29700 },
  { level: 35, xp_required: 31450 },
  { level: 36, xp_required: 33250 },
  { level: 37, xp_required: 35100 },
  { level: 38, xp_required: 37000 },
  { level: 39, xp_required: 38950 },
  { level: 40, xp_required: 40950 },
  { level: 41, xp_required: 43000 },
  { level: 42, xp_required: 45100 },
  { level: 43, xp_required: 47250 },
  { level: 44, xp_required: 49450 },
  { level: 45, xp_required: 51700 },
  { level: 46, xp_required: 54000 },
  { level: 47, xp_required: 56350 },
  { level: 48, xp_required: 58750 },
  { level: 49, xp_required: 61200 },
  { level: 50, xp_required: 63700 },
];

/**
 * Tính toán level và các thông tin liên quan từ total_xp
 * @param {number} totalXp - Tổng số XP của user
 * @returns {Object} - {level, xp_in_level, xp_required_current, xp_required_next, xp_to_next, level_progress}
 */
function calculateUserLevel(totalXp) {
  // Tìm level hiện tại
  let currentLevel = USER_LEVEL_CONFIG[0];
  
  for (let i = 0; i < USER_LEVEL_CONFIG.length; i++) {
    if (totalXp >= USER_LEVEL_CONFIG[i].xp_required) {
      currentLevel = USER_LEVEL_CONFIG[i];
    } else {
      break;
    }
  }

  // Tìm level tiếp theo
  const nextLevelIndex = USER_LEVEL_CONFIG.findIndex(cfg => cfg.level === currentLevel.level + 1);
  const nextLevel = nextLevelIndex !== -1 ? USER_LEVEL_CONFIG[nextLevelIndex] : null;

  // Tính các thông số
  const xp_required_current = currentLevel.xp_required;
  const xp_required_next = nextLevel ? nextLevel.xp_required : xp_required_current;
  const xp_in_level = totalXp - xp_required_current;
  const xp_to_next = nextLevel ? xp_required_next - totalXp : 0;
  
  // Tính progress % (0-100)
  const level_progress = nextLevel 
    ? Math.min(100, Math.max(0, (xp_in_level / (xp_required_next - xp_required_current)) * 100))
    : 100; // Nếu đã max level thì 100%

  return {
    level: currentLevel.level,
    xp_in_level: Math.max(0, xp_in_level),
    xp_required_current,
    xp_required_next,
    xp_to_next: Math.max(0, xp_to_next),
    level_progress: Math.round(level_progress * 100) / 100 // Làm tròn 2 chữ số
  };
}

/**
 * Cập nhật level và các thông số liên quan cho user
 * @param {Object} userDoc - Document của user (Mongoose model instance)
 * @returns {Object} - User document đã được cập nhật (chưa save)
 */
function updateUserLevel(userDoc) {
  if (!userDoc.stats) {
    userDoc.stats = {};
  }

  const totalXp = userDoc.stats.total_xp || 0;
  const levelInfo = calculateUserLevel(totalXp);

  // Cập nhật tất cả thông tin level
  userDoc.stats.level = levelInfo.level;
  userDoc.stats.xp_in_level = levelInfo.xp_in_level;
  userDoc.stats.xp_required_current = levelInfo.xp_required_current;
  userDoc.stats.xp_required_next = levelInfo.xp_required_next;
  userDoc.stats.xp_to_next = levelInfo.xp_to_next;
  userDoc.stats.level_progress = levelInfo.level_progress;

  return userDoc;
}

module.exports = {
  USER_LEVEL_CONFIG,
  calculateUserLevel,
  updateUserLevel
};
