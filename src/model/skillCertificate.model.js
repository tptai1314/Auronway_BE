const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SkillCertificateSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skill: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    level: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkillCertificate', SkillCertificateSchema);
