const mongoose = require('mongoose');

const certificateVerificationSchema = new mongoose.Schema({
  certificate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
  credential_id: String, // For quick lookup without join
  
  // Verification Details
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employer/verifier
  verification_method: { 
    type: String, 
    enum: ['QR_SCAN', 'MANUAL_LOOKUP', 'API'], 
    default: 'QR_SCAN' 
  },
  
  // Result
  is_valid: { type: Boolean, required: true },
  verification_note: String,
  
  // Technical Details
  ip_address: String,
  user_agent: String,
  location: String
}, { 
  timestamps: true 
});

// Indexes
certificateVerificationSchema.index({ certificate_id: 1 });
certificateVerificationSchema.index({ credential_id: 1 });
certificateVerificationSchema.index({ verified_by: 1 });
certificateVerificationSchema.index({ created_at: -1 });

module.exports = mongoose.model('CertificateVerification', certificateVerificationSchema);