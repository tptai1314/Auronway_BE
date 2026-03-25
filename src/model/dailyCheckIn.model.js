// model/dailyCheckIn.model.js
const mongoose = require('mongoose');

const dailyCheckInSchema = new mongoose.Schema({
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
  
  // Thông tin streak
  current_streak: { type: Number, default: 0 },
  longest_streak: { type: Number, default: 0 },
  total_check_ins: { type: Number, default: 0 },
  
  // Ngày check-in gần nhất
  last_check_in_date: Date,
  
  // Lịch sử check-in (lưu theo ngày)
  check_in_history: [{
    date: { type: Date, required: true },
    reward_xp: { type: Number, default: 0 },
    reward_items: [String], // bonus items nếu có
    streak_at_time: Number
  }]
}, { timestamps: true });

dailyCheckInSchema.index({ user_id: 1, tenant_id: 1 });
dailyCheckInSchema.index({ user_id: 1, last_check_in_date: 1 });

module.exports = mongoose.model('DailyCheckIn', dailyCheckInSchema);
