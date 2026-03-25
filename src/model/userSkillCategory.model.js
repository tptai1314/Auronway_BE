const mongoose = require("mongoose");

const userSkillCategorySchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCategory",
      required: true,
    },

    total_xp: { type: Number, default: 0 },

    level_index: { type: Number, default: 1 },
    level_code: {
      type: String,
      enum: ["BEGINNER", "ELEMENTARY", "INTERMEDIATE", "ADVANCED", "PROFICIENT"],
      default: "BEGINNER",
    },
  },
  { timestamps: true }
);

userSkillCategorySchema.index({ user_id: 1, category_id: 1 }, { unique: true });

module.exports = mongoose.model("UserSkillCategory", userSkillCategorySchema);
