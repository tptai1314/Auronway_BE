const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    campus_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      required: true,
    },
    organizer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
    },

    // Event Type & Category
    type: {
      type: String,
      enum: ["WORKSHOP", "COMPETITION", "SEMINAR", "VOLUNTEER", "TRAINING"],
      required: true,
    },

    mode: {
      type: String,
      enum: ["OFFLINE", "ONLINE", "HYBRID"],
      default: "OFFLINE",
    },

    tags: [String],

    // Management
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["DRAFT", "APPROVED", "CANCELLED"],
      default: "DRAFT",
    },
    // Timeline
    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },
    registration_open_at: Date,
    registration_close_at: Date,

    // Location & Format
    location: String,

    meeting_url: String,

    // Media
    cover_image_url: String, 
    media_urls: [String],

    // Skills & Rewards (simplified - chỉ cần skill và điểm thưởng)
    skills: [
      {
        skill_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Skill",
          required: true,
        },
        xp_reward: { type: Number, default: 0, required: true },
      },
    ],

    // QR Code Check-in
    qr_checkin_enabled: { type: Boolean, default: false },
    qr_code_token: { type: String, unique: true, sparse: true }, // Token để tạo QR
    qr_expires_at: Date, // Thời gian hết hạn QR code
    
    registered_count: { type: Number, default: 0 },
    attended_count: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
eventSchema.index({ tenant_id: 1, status: 1 });
eventSchema.index({ organizer_id: 1 });
eventSchema.index({ start_at: 1 });
eventSchema.index({ "skills.skill_id": 1 });

module.exports = mongoose.model("Event", eventSchema);
