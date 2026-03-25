const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password_hash: String,
    tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },

    // OAuth
    auth_provider: {
      type: String,
      enum: ["local", "google", "local+google"],
      default: "local",
    },
    google_id: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Profile
    profile: {
      full_name: String,
      avatar_url: String,
      student_id: String,
      major: String,
      bio: String,
      date_of_birth: Date,
      phone: String,
      links: {
        github: String,
        linkedin: String,
        portfolio: String,
      },
    },

    // System Roles
    roles: {
      type: [String],
      enum: ["SUPER_ADMIN", "TENANT_ADMIN", "STAFF", "PUBLIC_USER"],
      default: ["PUBLIC_USER"],
    },

    // Affiliations
    affiliations: [
      {
        tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
        campus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Campus" },
        organizer_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Organizer",
        },
        role: {
          type: String,
          enum: [
            "STUDENT",
            "TEACHER",
            "STAFF",
            "CLUB_ADMIN",
            "EVENT_MANAGER",
            "REVIEWER",
            "APPROVER",
          ],
          default: "STUDENT",
        },
        department: String,
        student_id: String,
        grade_level: String,
      },
    ],

    // Stats
    stats: {
      total_xp: { type: Number, default: 0 },
      level: { type: Number, default: 1 },

      xp_in_level: { type: Number, default: 0 }, 
      xp_required_current: { type: Number, default: 0 },
      xp_required_next: { type: Number, default: 100 }, 
      xp_to_next: { type: Number, default: 100 },
      level_progress: { type: Number, default: 0 },

      streak: { type: Number, default: 0 },
      completed_events: { type: Number, default: 0 },
      certificates_count: { type: Number, default: 0 },
    },
    // Timestamps
    last_login_at: Date,
    email_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ "affiliations.tenant_id": 1 });
userSchema.index({ "profile.student_id": 1 });

module.exports = mongoose.model("User", userSchema);
