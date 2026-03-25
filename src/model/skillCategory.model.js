// model/skillCategory.model.js
const mongoose = require("mongoose");

const skillCategorySchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, // communication, collaboration...
  name: { type: String, required: true },
  description: String,
  icon: String, // optional: icon cho UI
}, { timestamps: true });

module.exports = mongoose.model("SkillCategory", skillCategorySchema);
