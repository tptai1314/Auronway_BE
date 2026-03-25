const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true, required: true },
  domain: String, // "@neu.edu.vn"
  type: { type: String, enum: ['SCHOOL', 'COMPANY', 'COMMUNITY'], default: 'SCHOOL' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'PENDING'], default: 'ACTIVE' },
  short_name: String,
  // Settings
  settings: {
    allow_external_registration: { type: Boolean, default: false },
    require_approval: { type: Boolean, default: true },
    auto_join_domain: { type: Boolean, default: true },
    max_users: Number
  },
  
  // Contact
  contact: {
    email: String,
    phone: String,
    website: String,
    address: String,
  },
  
  // Branding
  branding: {
    logo_url: String,
    primary_color: String,
    secondary_color: String
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Tenant', tenantSchema);