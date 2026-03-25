const XPLedger = require('../../model/xpLedger.model');

/**
 * Lấy lịch sử tất cả tasks đã hoàn thành
 * @param {Object} user - User object
 * @param {Object} query - Query params (page, limit)
 * @returns {Promise<Object>} History tasks với pagination
 */
async function getHistoryTasks(user, query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(10, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  // Query từ XPLedger (tất cả các loại: STREAK_BONUS, QUEST_REWARD, EVENT_COMPLETION)
  const xpLedgers = await XPLedger.find({
    user_id: user._id
  })
    .populate('source_id', 'title')
    .sort({ effective_date: -1, created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await XPLedger.countDocuments({ user_id: user._id });

  // Transform thành format thống nhất
  const items = xpLedgers.map(ledger => {
    const baseTask = {
      date: ledger.effective_date || ledger.created_at,
      xp_reward: ledger.final_xp,
      source_type: ledger.source_type,
      description: ledger.description || '',
    };

    // Phân loại theo source_type
    switch (ledger.source_type) {
      case 'STREAK_BONUS':
        return {
          ...baseTask,
          type: 'DAILY_CHECKIN',
          title: ledger.source_name || 'Daily Check-in',
          items: [],
        };

      case 'QUEST_REWARD':
        return {
          ...baseTask,
          type: 'DAILY_QUEST',
          title: ledger.source_name || 'Daily Quest',
          items: [],
        };

      case 'EVENT_COMPLETION':
        return {
          ...baseTask,
          type: 'EVENT_CHECKIN',
          title: `Check-in: ${ledger.source_name || 'Event'}`,
          skill_breakdown: ledger.skill_breakdown || [],
          event_id: ledger.source_id?._id,
        };

      default:
        return {
          ...baseTask,
          type: 'OTHER',
          title: ledger.source_name || 'Task',
          items: [],
        };
    }
  });

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + limit < total,
    items,
  };
}

module.exports = {
  getHistoryTasks,
};

