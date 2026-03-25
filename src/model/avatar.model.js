const mongoose = require("mongoose");

const avatarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image_url: { type: String, required: true },
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },

    order: { type: Number, default: 0 }, // For sorting
  },
  {
    timestamps: true,
  }
);

// Indexes
avatarSchema.index({ tenant_id: 1, is_active: 1 });
avatarSchema.index({ is_default: 1 });

module.exports = mongoose.model("Avatar", avatarSchema);
