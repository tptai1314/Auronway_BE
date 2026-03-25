// model/dailyLoginReward.model.js
const mongoose = require('mongoose');

const dailyLoginRewardSchema = new mongoose.Schema({
  tenant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // Ngày thứ mấy trong chu kỳ 30 ngày
  day_number: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  
  // Phần thưởng
  reward_xp: {
    type: Number,
    default: 10
  },
  reward_items: [{
    item_type: String, // 'badge', 'avatar', 'title', etc.
    item_id: String,
    quantity: { type: Number, default: 1 }
  }],
  
  // Icon hiển thị
  icon_url: {
    type: String,
    default: 'https://cdn-icons-png.flaticon.com/512/891/891462.png' // Gift icon
  },
  
  // Ngày đặc biệt (7, 14, 21, 30)
  is_special: {
    type: Boolean,
    default: false
  },
  
  // Mô tả phần thưởng
  title: String,
  description: String,
  
  // Active/inactive
  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

dailyLoginRewardSchema.index({ tenant_id: 1, day_number: 1 }, { unique: true });
dailyLoginRewardSchema.index({ tenant_id: 1, is_active: 1 });

module.exports = mongoose.model('DailyLoginReward', dailyLoginRewardSchema);
