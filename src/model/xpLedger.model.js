const mongoose = require('mongoose');

const xpLedgerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  campus_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  
  // Source Tracking
  source_type: { 
    type: String, 
    enum: ['EVENT_COMPLETION', 'CERTIFICATE', 'PEER_REVIEW', 'MENTOR_ASSESSMENT', 'STREAK_BONUS', 'MANUAL_AWARD', 'QUEST_REWARD'],
    required: true 
  },
  source_id: mongoose.Schema.Types.ObjectId, // event_id, certificate_id, etc
  source_name: String, // For display purposes
  
  // XP Details
  base_xp: { type: Number, required: true },
  multiplier: { type: Number, default: 1.0 },
  bonus_xp: { type: Number, default: 0 },
  final_xp: { type: Number, required: true }, // (base_xp * multiplier) + bonus_xp
  
  // Skill Distribution
  skill_breakdown: [{
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    skill_name: String,
    xp_amount: { type: Number, required: true },
    level_before: Number,
    level_after: Number
  }],
  
  // Mascot Bonus
  mascot_bonus: {
    mascot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserMascot' },
    bonus_multiplier: { type: Number, default: 0 },
    mascot_xp_earned: { type: Number, default: 0 }
  },
  
  // Metadata
  description: String,
  awarded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For manual awards
    effective_date: { type: Date, default: Date.now }, // When XP should count
    organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true },
}, { 
  timestamps: true 
});

// Indexes
xpLedgerSchema.index({ user_id: 1, created_at: -1 });
xpLedgerSchema.index({ source_type: 1, source_id: 1 });
xpLedgerSchema.index({ 'skill_breakdown.skill_id': 1 });
xpLedgerSchema.index({ effective_date: 1 });

module.exports = mongoose.model('XPLedger', xpLedgerSchema);