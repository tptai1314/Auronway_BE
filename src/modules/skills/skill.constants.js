// Cấu hình level (có thể chỉnh lại XP sau cho hợp lý)
const LEVEL_CONFIG = [
  { level: 1, code: "BEGINNER", name: "Beginner", xp: 0 },
  { level: 2, code: "ELEMENTARY", name: "Elementary", xp: 100 },
  { level: 3, code: "INTERMEDIATE", name: "Intermediate", xp: 250 },
  { level: 4, code: "ADVANCED", name: "Advanced", xp: 500 },
  { level: 5, code: "PROFICIENT", name: "Proficient", xp: 900 },
];

function calculateLevelFromXp(totalXp) {
  let result = LEVEL_CONFIG[0];
  for (const cfg of LEVEL_CONFIG) {
    if (totalXp >= cfg.xp) {
      result = cfg;
    } else {
      break;
    }
  }

  const next = LEVEL_CONFIG.find((c) => c.level === result.level + 1);
  const progress =
    next && next.xp > result.xp
      ? Math.min(
          100,
          Math.max(0, ((totalXp - result.xp) / (next.xp - result.xp)) * 100)
        )
      : 100;

  return {
    level_index: result.level,
    level_code: result.code,
    progress,
  };
}

// Đơn giản: score 0-10 → XP
function scoreToXp(score) {
  const s = Math.max(0, Math.min(10, Number(score) || 0));
  return s * 5; // ví dụ: 8 điểm → 40 XP
}

module.exports = {
  LEVEL_CONFIG,
  calculateLevelFromXp,
  scoreToXp,
};
