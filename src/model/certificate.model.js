const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Đã khai báo index ở dưới
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  
  // Content
  title: { type: String, required: true },
  recipient_name: { type: String, required: true },
  description: String,
  issued_by: String, // Organization name
  credential_id: { type: String, unique: true }, // Unique certificate code
  
  // Files
  pdf_url: String,
  image_url: String,
  qr_code_url: String,
  
  // Metadata
  issued_at: { type: Date, default: Date.now },
  expires_at: Date,
  status: { 
    type: String, 
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], 
    default: 'ACTIVE' 
  },
  
  // Revocation info
  revoked_at: Date,
  revoked_reason: String,
  revoked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Skills data
  skills_data: [{
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    skill_name: String,
    level_achieved: Number,
    xp_earned: Number
  }],
    organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true }
}, { 
  timestamps: true 
});

// Indexes
certificateSchema.index({ user_id: 1, issued_at: -1 });
certificateSchema.index({ credential_id: 1 });
certificateSchema.index({ skill_id: 1 });
certificateSchema.index({ event_id: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);