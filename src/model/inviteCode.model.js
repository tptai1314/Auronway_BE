const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // Đã khai báo index ở dưới
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  
  // Creator
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Usage Limits
  max_uses: { type: Number, default: 100 },
  used_count: { type: Number, default: 0 },
  used_by: [{ 
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    used_at: { type: Date, default: Date.now },
    email: String
  }],
  
  // Expiry
  expires_at: Date,
  is_active: { type: Boolean, default: true },
  
  // Settings
  settings: {
    allowed_roles: [{ type: String, enum: ['STUDENT', 'TEACHER', 'STAFF'] }],
    auto_join_tenant: { type: Boolean, default: true },
    require_approval: { type: Boolean, default: false },
    valid_domains: [String] // Restrict to specific email domains
  },
  
  // Tracking
  last_used_at: Date
}, { 
  timestamps: true 
});

// Indexes
inviteCodeSchema.index({ code: 1 });
inviteCodeSchema.index({ tenant_id: 1 });
inviteCodeSchema.index({ expires_at: 1 });
inviteCodeSchema.index({ is_active: 1 });

module.exports = mongoose.model('InviteCode', inviteCodeSchema);