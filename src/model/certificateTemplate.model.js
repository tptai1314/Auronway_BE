const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  type: { 
    type: String, 
    enum: ['COMPLETION', 'ACHIEVEMENT', 'SKILL_LEVEL', 'PARTICIPATION'],
    required: true 
  },
  
  // Design Configuration
  design: {
    background_url: String,
    layout: Map, // { title: {x, y, font, size}, name: {x, y, font, size} }
    colors: {
      primary: String,
      secondary: String,
      accent: String
    },
    logo_url: String,
    signature_url: String
  },
  
  // Content Template
  content_template: {
    title: String,
    description: String,
    issuer_name: String,
    custom_fields: Map // Dynamic fields for different certificate types
  },
  
  // Auto-Issue Rules (embedded)
  auto_issue_rules: [{
    name: String,
    trigger_type: { 
      type: String, 
      enum: ['EVENT_COMPLETION', 'SKILL_LEVEL', 'SCORE_THRESHOLD', 'MANUAL'],
      required: true 
    },
    conditions: Map, // { min_score: 8, required_skills: [], min_level: 3 }
    is_active: { type: Boolean, default: true },
    priority: { type: Number, default: 1 }
  }],
  
  // Settings
  is_active: { type: Boolean, default: true },
  requires_approval: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

// Indexes
certificateTemplateSchema.index({ tenant_id: 1, type: 1 });
certificateTemplateSchema.index({ is_active: 1 });

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);