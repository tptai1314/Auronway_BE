// modules/daily/daily.service.js
const DailyCheckIn = require('../../model/dailyCheckIn.model');
const DailyQuest = require('../../model/dailyQuest.model');
const UserDailyQuest = require('../../model/userDailyQuest.model');
const User = require('../../model/user.model');
const DailyLoginReward = require('../../model/dailyLoginReward.model');
const XPLedger = require('../../model/xpLedger.model');
const { updateUserLevel } = require('../../utils/user.level.config');

// ===== HELPER FUNCTIONS =====
function getStartOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function throwError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

// Tính toán streak thực tế (kiểm tra xem streak có bị mất do bỏ lỡ ngày không)
function calculateActualStreak(checkIn) {
  if (!checkIn || !checkIn.last_check_in_date) {
    return 0;
  }

  const today = getStartOfDay();
  const lastCheckIn = getStartOfDay(checkIn.last_check_in_date);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Nếu check-in hôm nay hoặc hôm qua, streak vẫn hợp lệ
  if (lastCheckIn.getTime() === today.getTime() || lastCheckIn.getTime() === yesterday.getTime()) {
    return checkIn.current_streak;
  }

  // Nếu bỏ lỡ nhiều hơn 1 ngày, streak đã bị mất
  return 0;
}

// Khởi tạo config phần thưởng mặc định cho 30 ngày
async function initializeDefaultRewards(tenantId) {
  const specialDays = [7, 14, 21, 30];
  const rewards = [];

  for (let day = 1; day <= 30; day++) {
    const isSpecial = specialDays.includes(day);
    const baseXP = 10;
    const streakBonus = Math.floor(day / 7) * 5;
    const rewardXP = baseXP + streakBonus;

    rewards.push({
      tenant_id: tenantId,
      day_number: day,
      reward_xp: rewardXP,
      reward_items: isSpecial ? [{ item_type: 'badge', item_id: 'streak_badge', quantity: 1 }] : [],
      icon_url: isSpecial 
        ? 'https://cdn-icons-png.flaticon.com/512/3468/3468377.png' // Dragon icon
        : 'https://cdn-icons-png.flaticon.com/512/891/891462.png', // Gift icon
      is_special: isSpecial,
      title: isSpecial ? `Special Day ${day}!` : `Day ${day} Reward`,
      description: isSpecial ? `Streak milestone! +${rewardXP} XP` : `Daily check-in reward: +${rewardXP} XP`,
      is_active: true
    });
  }

  await DailyLoginReward.insertMany(rewards);
}

// ===== CHECK-IN SERVICE =====

// Kiểm tra trạng thái check-in hôm nay
async function getCheckInStatus(user) {
  let checkIn = await DailyCheckIn.findOne({
    user_id: user._id,
    tenant_id: user.tenant_id
  });

  if (!checkIn) {
    checkIn = new DailyCheckIn({
      user_id: user._id,
      tenant_id: user.tenant_id,
      current_streak: 0,
      longest_streak: 0,
      total_check_ins: 0
    });
    await checkIn.save();
  }

  const today = getStartOfDay();
  const lastCheckIn = checkIn.last_check_in_date ? getStartOfDay(checkIn.last_check_in_date) : null;
  const hasCheckedInToday = lastCheckIn && lastCheckIn.getTime() === today.getTime();

  // Tính toán streak thực tế (có thể đã mất nếu bỏ lỡ ngày)
  const actualStreak = calculateActualStreak(checkIn);

  return {
    has_checked_in_today: hasCheckedInToday,
    current_streak: actualStreak,
    longest_streak: checkIn.longest_streak,
    total_check_ins: checkIn.total_check_ins,
    last_check_in_date: checkIn.last_check_in_date
  };
}

// Lấy calendar config cho 30 ngày check-in
async function getCheckInCalendar(user) {
  let tenantId = user.tenant_id;
  
  // Fallback tìm tenant từ affiliations nếu user chưa có tenant chính
  if (!tenantId && user.affiliations && user.affiliations.length > 0) {
    tenantId = user.affiliations[0].tenant_id;
  }

  // Nếu vẫn không có tenant, trả về kết quả rỗng (tránh crash)
  if (!tenantId) {
    return {
      cells: [],
      current_streak: 0,
      checked_in_today: false,
      longest_streak: 0,
      total_check_ins: 0,
      message: "Vui lòng tham gia một tổ chức để sử dụng tính năng này."
    };
  }

  let checkIn = await DailyCheckIn.findOne({
    user_id: user._id,
    tenant_id: tenantId
  });

  if (!checkIn) {
    checkIn = new DailyCheckIn({
      user_id: user._id,
      tenant_id: tenantId,
      current_streak: 0,
      longest_streak: 0,
      total_check_ins: 0
    });
    await checkIn.save();
  }

  const today = getStartOfDay();
  const lastCheckIn = checkIn.last_check_in_date ? getStartOfDay(checkIn.last_check_in_date) : null;
  const hasCheckedInToday = lastCheckIn && lastCheckIn.getTime() === today.getTime();
  
  // Tính toán streak thực tế (có thể đã mất nếu bỏ lỡ ngày)
  const currentStreak = calculateActualStreak(checkIn);

  // Lấy config phần thưởng từ DB
  let rewardConfigs = await DailyLoginReward.find({
    tenant_id: tenantId,
    is_active: true
  }).sort({ day_number: 1 });

  // Nếu chưa có config, tạo default config cho 30 ngày
  if (rewardConfigs.length === 0) {
    await initializeDefaultRewards(tenantId);
    // Lấy lại sau khi tạo
    rewardConfigs = await DailyLoginReward.find({
      tenant_id: tenantId,
      is_active: true
    }).sort({ day_number: 1 });
  }

  // Build cells từ config
  // Tính position trong cycle 30 ngày
  const currentCycleDay = currentStreak === 0 ? 0 : ((currentStreak - 1) % 30) + 1;
  const nextCycleDay = ((currentStreak) % 30) + 1;
  
  const cells = [];
  for (const config of rewardConfigs) {
    const day = config.day_number;
    let state = 'locked';
    
    if (hasCheckedInToday) {
      // Đã check-in hôm nay
      if (day <= currentCycleDay) {
        state = 'claimed';
      } else {
        state = 'locked';
      }
    } else {
      // Chưa check-in hôm nay
      if (currentStreak === 0) {
        // Chưa check-in lần nào
        if (day === 1) {
          state = 'current';
        } else {
          state = 'locked';
        }
      } else {
        // Đã có streak
        if (day < nextCycleDay) {
          state = 'claimed';
        } else if (day === nextCycleDay) {
          state = 'current';
        } else {
          state = 'locked';
        }
      }
    }

    cells.push({
      day_number: config.day_number,
      reward_xp: config.reward_xp,
      reward_items: config.reward_items,
      icon_url: config.icon_url,
      is_special: config.is_special,
      title: config.title,
      description: config.description,
      state: state
    });
  }

  return {
    cells: cells,
    current_streak: currentStreak,
    checked_in_today: hasCheckedInToday,
    longest_streak: checkIn.longest_streak,
    total_check_ins: checkIn.total_check_ins
  };
}

// Thực hiện check-in hằng ngày
async function performCheckIn(user) {
  let tenantId = user.tenant_id;
  if (!tenantId && user.affiliations && user.affiliations.length > 0) {
    tenantId = user.affiliations[0].tenant_id;
  }
  if (!tenantId) {
    throwError('Bạn chưa tham gia tổ chức nào để thực hiện điểm danh.', 400);
  }

  let checkIn = await DailyCheckIn.findOne({
    user_id: user._id,
    tenant_id: tenantId
  });

  if (!checkIn) {
    checkIn = new DailyCheckIn({
      user_id: user._id,
      tenant_id: tenantId
    });
  }

  const today = getStartOfDay();
  const lastCheckIn = checkIn.last_check_in_date ? getStartOfDay(checkIn.last_check_in_date) : null;

  // Kiểm tra đã check-in hôm nay chưa
  if (lastCheckIn && lastCheckIn.getTime() === today.getTime()) {
    throwError('Bạn đã check-in hôm nay rồi', 400);
  }

  // Tính streak
  let newStreak = 1;
  if (lastCheckIn) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastCheckIn.getTime() === yesterday.getTime()) {
      // Check-in liên tiếp
      newStreak = checkIn.current_streak + 1;
    }
  }

  // Lấy phần thưởng từ config
  let rewardConfig = await DailyLoginReward.findOne({
    tenant_id: user.tenant_id,
    day_number: newStreak <= 30 ? newStreak : 30, // Cap at day 30
    is_active: true
  });

  // Nếu không có config, khởi tạo và lấy lại
  if (!rewardConfig) {
    await initializeDefaultRewards(user.tenant_id);
    rewardConfig = await DailyLoginReward.findOne({
      tenant_id: user.tenant_id,
      day_number: newStreak <= 30 ? newStreak : 30,
      is_active: true
    });
  }

  // Fallback nếu vẫn null (streak > 30)
  const rewardXP = rewardConfig?.reward_xp || 10 + Math.floor(newStreak / 7) * 5;
  const rewardItems = rewardConfig?.reward_items || [];

  // Cập nhật check-in
  checkIn.current_streak = newStreak;
  checkIn.longest_streak = Math.max(checkIn.longest_streak, newStreak);
  checkIn.total_check_ins += 1;
  checkIn.last_check_in_date = today;
  checkIn.check_in_history.push({
    date: today,
    reward_xp: rewardXP,
    reward_items: rewardItems.map(item => item.item_type),
    streak_at_time: newStreak
  });

  await checkIn.save();

  // Cộng XP cho user và tự động cập nhật level
  const userDoc = await User.findById(user._id);
  let leveledUp = false;
  let oldLevel = 0;
  let newLevel = 0;
  
  if (userDoc) {
    userDoc.stats = userDoc.stats || {};
    oldLevel = userDoc.stats.level || 1;
    userDoc.stats.total_xp = (userDoc.stats.total_xp || 0) + rewardXP;
    
    // Tự động cập nhật level dựa trên total_xp mới
    updateUserLevel(userDoc);
    newLevel = userDoc.stats.level || 1;
    leveledUp = newLevel > oldLevel;
    
    await userDoc.save();
  }

  // Tạo XPLedger entry (chỉ để tracking, không có skill_breakdown)
  // Lấy campus_id và organizer_id từ user affiliations
  const userAffiliations = await User.findById(user._id).select('affiliations').lean();
  const affiliation = userAffiliations?.affiliations?.find(a => a.tenant_id?.toString() === tenantId?.toString());
  const campusId = affiliation?.campus_id || null;
  const organizerId = affiliation?.organizer_id || null;

  // Chỉ tạo XPLedger nếu có campus_id và organizer_id (required fields)
  if (campusId && organizerId) {
    const xpLedger = new XPLedger({
      user_id: user._id,
      campus_id: campusId,
      source_type: 'STREAK_BONUS',
      source_id: checkIn._id,
      source_name: `Daily Check-in - Streak ${newStreak}`,
      base_xp: rewardXP,
      final_xp: rewardXP,
      skill_breakdown: [], // Không có skill XP
      organizer_id: organizerId,
      description: `Check-in ngày ${today.toLocaleDateString('vi-VN')} - Streak ${newStreak}`,
      effective_date: today,
    });
    await xpLedger.save();
  }

  // DAILY_LOGIN quest đã được xử lý trong auth.service khi user đăng nhập
  // Check-in chỉ dành cho streak rewards, không trigger DAILY_LOGIN quest ở đây

  return {
    message: 'Check-in thành công!',
    reward_xp: rewardXP,
    reward_items: rewardItems,
    current_streak: newStreak,
    longest_streak: checkIn.longest_streak,
    total_check_ins: checkIn.total_check_ins,
    leveled_up: leveledUp,
    old_level: oldLevel,
    new_level: newLevel
  };
}

// ===== DAILY QUEST SERVICE =====

// Lấy danh sách quest của user hôm nay
async function getUserDailyQuests(user) {
  const today = getStartOfDay();

  // Resolve tenantId
  let tenantId = user.tenant_id;
  if (!tenantId && user.affiliations && user.affiliations.length > 0) {
    tenantId = user.affiliations[0].tenant_id; 
  }

  // Nếu không có tenant, trả về rỗng (vì quest gắn với tenant)
  if (!tenantId) {
    return [];
  }
  
  // Lấy tất cả quest active
  const activeQuests = await DailyQuest.find({ is_active: true });
  
  // Lấy tiến độ của user
  const userQuests = await UserDailyQuest.find({
    user_id: user._id,
    date: today
  }).populate('quest_id');

  // Lọc bỏ các quest đã bị xóa (quest_id = null)
  const validUserQuests = userQuests.filter(uq => uq.quest_id != null);

  // Nếu chưa có quest hôm nay, tạo mới
  const existingQuestIds = validUserQuests.map(uq => uq.quest_id._id.toString());
  const missingQuests = activeQuests.filter(q => !existingQuestIds.includes(q._id.toString()));

  for (const quest of missingQuests) {
    const newUserQuest = new UserDailyQuest({
      user_id: user._id,
      tenant_id: tenantId,
      quest_id: quest._id,
      date: today,
      target: quest.target,
      status: 'IN_PROGRESS'
    });
    await newUserQuest.save();
    
    // Populate quest_id for newUserQuest
    await newUserQuest.populate('quest_id');
    validUserQuests.push(newUserQuest);
  }

  // Format response
  return validUserQuests.map(uq => ({
    _id: uq.quest_id._id,
    code: uq.quest_id.code,
    title: uq.quest_id.title,
    description: uq.quest_id.description,
    type: uq.quest_id.type,
    target_value: uq.target,
    reward_xp: uq.quest_id.reward_xp,
    reward_items: uq.quest_id.reward_items,
    icon: uq.quest_id.icon,
    color: uq.quest_id.color,
    user_progress: {
      current_value: uq.current_progress || 0,
      is_completed: uq.status === 'COMPLETED' || uq.status === 'CLAIMED',
      is_claimed: uq.status === 'CLAIMED',
      status: uq.status
    }
  }));
}

// Cập nhật tiến độ quest (gọi từ các module khác)
// Dùng khi user thực hiện hành động tương ứng với quest type
async function increaseProgress(userId, questType, increment = 1) {
  const today = getStartOfDay();
  
  // Tìm user
  const user = await User.findById(userId);
  if (!user) {
    console.warn('User not found:', userId);
    return;
  }

  // Resolve tenantId
  let tenantId = user.tenant_id;
  if (!tenantId && user.affiliations && user.affiliations.length > 0) {
    tenantId = user.affiliations[0].tenant_id;
  }
  
  // Tìm tất cả quest active với type này
  const quests = await DailyQuest.find({ type: questType, is_active: true });
  
  for (const quest of quests) {
    let userQuest = await UserDailyQuest.findOne({
      user_id: user._id,
      quest_id: quest._id,
      date: today
    });

    if (!userQuest) {
      // Nếu không có tenant, không thể tạo quest mới
      if (!tenantId) continue;

      userQuest = new UserDailyQuest({
        user_id: user._id,
        tenant_id: tenantId,
        quest_id: quest._id,
        date: today,
        target: quest.target,
        current_progress: 0,
        status: 'IN_PROGRESS'
      });
    }

    if (userQuest.status === 'IN_PROGRESS') {
      userQuest.current_progress += increment;
      
      // Kiểm tra hoàn thành
      if (userQuest.current_progress >= userQuest.target) {
        userQuest.status = 'COMPLETED';
        userQuest.completed_at = new Date();
      }
      
      await userQuest.save();
    }
  }
}

// Nhận thưởng quest
async function claimQuestReward(user, questId) {
  const today = getStartOfDay();
  
  const userQuest = await UserDailyQuest.findOne({
    user_id: user._id,
    quest_id: questId,
    date: today
  }).populate('quest_id');

  if (!userQuest) {
    throwError('Nhiệm vụ không tồn tại', 404);
  }

  if (userQuest.status === 'CLAIMED') {
    throwError('Đã nhận thưởng rồi', 400);
  }

  if (userQuest.status !== 'COMPLETED') {
    throwError('Nhiệm vụ chưa hoàn thành', 400);
  }

  // Cộng XP cho user và tự động cập nhật level
  const userDoc = await User.findById(user._id);
  const rewardXP = userQuest.quest_id.reward_xp || 0;
  
  let leveledUp = false;
  let oldLevel = 0;
  let newLevel = 0;
  
  if (userDoc) {
    userDoc.stats = userDoc.stats || {};
    oldLevel = userDoc.stats.level || 1;
    userDoc.stats.total_xp = (userDoc.stats.total_xp || 0) + rewardXP;
    
    // Tự động cập nhật level dựa trên total_xp mới
    updateUserLevel(userDoc);
    newLevel = userDoc.stats.level || 1;
    leveledUp = newLevel > oldLevel;
    
    await userDoc.save();
  }

  // Tạo XPLedger entry (chỉ để tracking, không có skill_breakdown)
  // Lấy campus_id và organizer_id từ user affiliations
  const tenantId = userQuest.tenant_id || userDoc?.tenant_id || (userDoc?.affiliations?.[0]?.tenant_id);
  const affiliation = userDoc?.affiliations?.find(a => a.tenant_id?.toString() === tenantId?.toString());
  const campusId = affiliation?.campus_id || null;
  const organizerId = affiliation?.organizer_id || null;

  // Chỉ tạo XPLedger nếu có campus_id và organizer_id (required fields)
  if (campusId && organizerId) {
    const xpLedger = new XPLedger({
      user_id: user._id,
      campus_id: campusId,
      source_type: 'QUEST_REWARD',
      source_id: userQuest.quest_id._id,
      source_name: userQuest.quest_id.title || 'Daily Quest',
      base_xp: rewardXP,
      final_xp: rewardXP,
      skill_breakdown: [], // Không có skill XP
      organizer_id: organizerId,
      description: `Hoàn thành nhiệm vụ: ${userQuest.quest_id.title || 'Daily Quest'}`,
      effective_date: today,
    });
    await xpLedger.save();
  }

  // Cập nhật trạng thái
  userQuest.status = 'CLAIMED';
  userQuest.claimed_at = new Date();
  await userQuest.save();

  return {
    message: 'Nhận thưởng thành công!',
    reward_xp: rewardXP,
    reward_items: userQuest.quest_id.reward_items,
    leveled_up: leveledUp,
    old_level: oldLevel,
    new_level: newLevel
  };
}

// ===== ADMIN: Quản lý Daily Quest =====
async function createDailyQuest(data) {
  const quest = new DailyQuest(data);
  await quest.save();
  return quest;
}

async function getAllDailyQuests() {
  return DailyQuest.find({});
}

async function updateDailyQuest(questId, data) {
  const quest = await DailyQuest.findById(questId);
  if (!quest) throwError('Quest không tồn tại', 404);
  
  Object.assign(quest, data);
  await quest.save();
  return quest;
}

async function deleteDailyQuest(questId) {
  const quest = await DailyQuest.findById(questId);
  if (!quest) throwError('Quest không tồn tại', 404);
  
  await quest.deleteOne();
  return { message: 'Xóa quest thành công' };
}

// ===== QUEST HISTORY =====
async function getQuestHistory7Days(user) {
  const today = getStartOfDay();
  const history = [];

  // Resolve tenantId
  let tenantId = user.tenant_id;
  if (!tenantId && user.affiliations && user.affiliations.length > 0) {
    tenantId = user.affiliations[0].tenant_id;
  }

  // Lấy tất cả quest active để biết tổng số quest
  const activeQuests = await DailyQuest.find({ is_active: true });
  const totalQuestsPerDay = activeQuests.length;

  // Lặp qua 7 ngày gần nhất (từ hôm nay đến 6 ngày trước)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = getStartOfDay(date);

    // Lấy các quest của user trong ngày đó
    const userQuests = await UserDailyQuest.find({
      user_id: user._id,
      date: dayStart
    });

    // Đếm số quest đã hoàn thành (COMPLETED hoặc CLAIMED)
    const completedCount = userQuests.filter(
      uq => uq.status === 'COMPLETED' || uq.status === 'CLAIMED'
    ).length;

    // Tính phần trăm hoàn thành
    const completionRate = totalQuestsPerDay > 0 
      ? Math.round((completedCount / totalQuestsPerDay) * 100) 
      : 0;

    // Xác định label ngày
    let dateLabel = '';
    if (i === 0) {
      dateLabel = 'Hôm nay';
    } else if (i === 1) {
      dateLabel = 'Hôm qua';
    } else {
      dateLabel = `${i} ngày trước`;
    }

    history.push({
      date: dayStart,
      date_label: dateLabel,
      completed_count: completedCount,
      total_count: totalQuestsPerDay,
      completion_rate: completionRate,
      is_perfect: completedCount === totalQuestsPerDay && totalQuestsPerDay > 0
    });
  }

  return {
    history: history,
    total_days: 7,
    perfect_days: history.filter(h => h.is_perfect).length
  };
}

module.exports = {
  // Check-in
  getCheckInStatus,
  getCheckInCalendar,
  performCheckIn,
  
  // Daily Quest
  getUserDailyQuests,
  increaseProgress, // Export để các module khác gọi
  claimQuestReward,
  getQuestHistory7Days,
  
  // Admin
  createDailyQuest,
  getAllDailyQuests,
  updateDailyQuest,
  deleteDailyQuest
};
