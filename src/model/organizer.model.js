const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  type: { type: String, enum: ['CLUB', 'DEPARTMENT', 'OFFICE', 'COMMITTEE'], required: true },
  
  // Authentication credentials for club login (chỉ dành cho CLUB type)
  email: { type: String, unique: true, sparse: true }, // Email đăng nhập của CLB
  password_hash: String, // Mật khẩu đã hash
  
  // Management
  manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ 
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    joined_at: { type: Date, default: Date.now }
  }],
  
  // Description
  description: String,
  contact_email: String,
  logo_url: String, // Logo của CLB
  is_active: { type: Boolean, default: true },
  is_private: { type: Boolean, default: false }, // Chỉ thành viên mới xem được events
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Stats
  stats: {
    total_events: { type: Number, default: 0 }, // Số event đã tổ chức
    total_participants: { type: Number, default: 0 }, // Số sinh viên tham gia
    total_certificates: { type: Number, default: 0 }, // Số chứng chỉ được cấp
    avg_kpi: { type: Number, default: 0 } // Điểm trung bình KPI
  }
}, { 
  timestamps: true 
});

// Indexes
organizerSchema.index({ tenant_id: 1 });
organizerSchema.index({ tenant_id: 1, type: 1 });
organizerSchema.index({ 'members.user_id': 1 });

// Methods
organizerSchema.methods.isMember = function(userId) {
  if (!userId) return false;
  return this.members.some(m => m.user_id.toString() === userId.toString());
};

organizerSchema.methods.isManager = function(userId) {
  if (!userId) return false;
  return this.manager_id && this.manager_id.toString() === userId.toString();
};

organizerSchema.methods.canViewEvents = function(userId) {
  // Nếu không private, ai cũng xem được
  if (!this.is_private) return true;
  
  // Nếu private, chỉ thành viên hoặc manager mới xem được
  return this.isMember(userId) || this.isManager(userId);
};

module.exports = mongoose.model('Organizer', organizerSchema);