const mongoose = require("mongoose");
const { Schema } = mongoose;

const campusSchema = new Schema(
  {
    // Thuộc trường nào
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },

    // Tên cơ sở
    name: {
      type: String,
      required: true,
    },

    // Mã cơ sở: HN, HCM, DN...
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    // Thông tin hiển thị
    description: String,

    // Trạng thái
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
    },

    // Liên hệ
    contact: {
      email: String,
      phone: String,
      website: String,
      address: String,
    },

    // Branding theo campus
    branding: {
      logo_url: String,
      cover_image: String,
      primary_color: String,
      secondary_color: String,
      certificate_footer: String, // Chữ ký/dấu campus cho certificate
    },

    // Cấu hình campus
    settings: {
      allow_cross_organizer_access: { type: Boolean, default: false },
      default_role: {
        type: String,
        enum: ["STUDENT", "TEACHER", "STAFF"],
        default: "STUDENT",
      },
    },

    // Flags
    is_default: { type: Boolean, default: false }, // campus mặc định của tenant
  },
  {
    timestamps: true,
  }
);

// Unique campus code per tenant
campusSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

module.exports = mongoose.model("Campus", campusSchema);
