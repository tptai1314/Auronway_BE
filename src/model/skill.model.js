const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillCategory",
      required: true,
    },

    code: { type: String, required: true, unique: true }, // "presentation", "teamwork"
    name: { type: String, required: true }, // EN
    label_vi: String, // VI
    description: String,
    icon_url: String, // optional: icon cho UI
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

skillSchema.index({ category_id: 1 });

module.exports = mongoose.model("Skill", skillSchema);
