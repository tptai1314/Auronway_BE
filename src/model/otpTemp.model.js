const mongoose = require('mongoose');

const otpTempSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  password: { type: String, required: true },
  profile: { type: Object },
  invite_code: { type: String },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
});

module.exports = mongoose.model('OTPTemp', otpTempSchema);
