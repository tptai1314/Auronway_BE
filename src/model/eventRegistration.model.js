const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["REGISTERED", "ATTENDED", "CANCELLED"],
      default: "REGISTERED",
    },

    // Timeline
    registered_at: { type: Date, default: Date.now },
    attended_at: Date,
    xp_awarded: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
eventRegistrationSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
eventRegistrationSchema.index({ user_id: 1, status: 1 });
eventRegistrationSchema.index({ event_id: 1, status: 1 });

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);
