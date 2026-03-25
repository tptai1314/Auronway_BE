// model/dailyQuest.model.js
const mongoose = require('mongoose');

const dailyQuestSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  
  // Loại nhiệm vụ
  type: {
    type: String,
    enum: ['DAILY_LOGIN', 'EVENT_ATTEND', 'EVENT_REGISTER', 'SKILL_XP', 'REVIEW_SUBMIT', 'CUSTOM'],
    required: true
  },
  
  // Điều kiện hoàn thành
  target: { type: Number, default: 1 }, // số lần/số lượng cần đạt
  
  // Phần thưởng
  reward_xp: { type: Number, default: 0 },
  reward_items: [String], // items khác nếu có
  
  // Trạng thái
  is_active: { type: Boolean, default: true },
  
  // Icon/UI
  icon: String,
  color: String
}, { timestamps: true });

module.exports = mongoose.model('DailyQuest', dailyQuestSchema);
