const XPLedger = require('../../model/xpLedger.model');

async function addXP({ user, event }) {
  let totalXP = 0;
  const skill_breakdown = event.skills?.map(s => {
    totalXP += s.xp_reward || 0;
    return {
      skill_id: s.skill_id,
      skill_name: s.skill_id?.toString(),
      xp_amount: s.xp_reward || 0,
      level_before: 1,
      level_after: 1
    };
  }) || [];
  const xpLedger = new XPLedger({
    user_id: user._id,
    campus_id: event.campus_id,
    source_type: 'EVENT_COMPLETION',
    source_id: event._id,
    source_name: event.title,
    base_xp: totalXP,
    final_xp: totalXP,
    skill_breakdown,
    organizer_id: event.organizer_id,
    description: `Hoàn thành event ${event.title}`,
    effective_date: new Date(),
  });
  await xpLedger.save();
  return { totalXP, xpLedger };
}

module.exports = { addXP };
