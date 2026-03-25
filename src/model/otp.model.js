const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Đã khai báo index ở dưới
  email: { type: String, required: true }, // Đã khai báo index ở dưới
  code: { type: String, required: true }, // Đã khai báo index ở dưới
  type: { 
    type: String, 
    enum: ['email_verification', 'password_reset'],
    required: true 
  },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
  used_at: Date
}, { 
  timestamps: true 
});

// TTL index for auto-expiry
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
otpSchema.index({ email: 1, code: 1, type: 1 });

module.exports = mongoose.model('OTP', otpSchema);