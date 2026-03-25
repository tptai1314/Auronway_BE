// model/userDailyQuest.model.js
const mongoose = require('mongoose');

const userDailyQuestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  quest_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyQuest',
    required: true
  },
  
  // Ngày reset (để biết quest này thuộc ngày nào)
  date: { type: Date, required: true },
  
  // Tiến độ
  current_progress: { type: Number, default: 0 },
  target: { type: Number, required: true },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'CLAIMED'],
    default: 'IN_PROGRESS'
  },
  
  // Thời gian hoàn thành và nhận thưởng
  completed_at: Date,
  claimed_at: Date
}, { timestamps: true });

userDailyQuestSchema.index({ user_id: 1, date: 1 });
userDailyQuestSchema.index({ user_id: 1, quest_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyQuest', userDailyQuestSchema);
