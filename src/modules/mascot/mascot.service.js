const UserMascot = require('../../model/userMascot.model');

async function addMascotXP({ user, xp }) {
  const mascot = await UserMascot.findOne({ user_id: user._id });
  if (mascot) {
    mascot.xp += xp;
    // Tăng level nếu đủ XP (giả lập: mỗi 100 XP lên 1 level)
    const newLevel = Math.floor(mascot.xp / 100) + 1;
    if (newLevel > mascot.level) mascot.level = newLevel;
    await mascot.save();
    return mascot;
  }
  return null;
}

module.exports = { addMascotXP };
