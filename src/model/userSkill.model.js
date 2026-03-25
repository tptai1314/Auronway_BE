const mongoose = require("mongoose");

const userSkillSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skill_id: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true },

    total_xp: { type: Number, default: 0 },

    level_index: { type: Number, default: 1 }, // 1-5
    level_code: {
      type: String,
      enum: ["BEGINNER", "ELEMENTARY", "INTERMEDIATE", "ADVANCED", "PROFICIENT"],
      default: "BEGINNER",
    },

    progress: { type: Number, default: 0 }, // % tới level tiếp theo
  },
  { timestamps: true }
);

userSkillSchema.index({ user_id: 1, skill_id: 1 }, { unique: true });

module.exports = mongoose.model("UserSkill", userSkillSchema);
