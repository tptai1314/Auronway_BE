const mongoose = require("mongoose");

/**
 * Model để quản lý QR Code check-in cho sự kiện
 * Mỗi event sẽ có QR code riêng với thời gian hiệu lực
 */
const eventCheckInSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true, // Mỗi event chỉ có 1 QR code active
    },

    // QR Code data (có thể là token hoặc encrypted string)
    qr_code_token: {
      type: String,
      required: true,
      unique: true,
    },

    // Thời gian hiệu lực của QR code
    expires_at: {
      type: Date,
      required: true,
    },

    // Trạng thái QR code
    is_active: {
      type: Boolean,
      default: true,
    },

    // Giới hạn số lần quét (nếu cần)
    max_scans: {
      type: Number,
      default: null, // null = không giới hạn
    },

    // Số lần đã được quét
    scan_count: {
      type: Number,
      default: 0,
    },

    // Ai tạo QR code này (thường là EVENT_MANAGER của CLB)
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Lịch sử check-in qua QR code này
    check_ins: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        checked_in_at: {
          type: Date,
          default: Date.now,
        },
        location: {
          latitude: Number,
          longitude: Number,
        },
        device_info: String, // Optional: thông tin thiết bị quét
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
eventCheckInSchema.index({ event_id: 1 });
eventCheckInSchema.index({ qr_code_token: 1 });
eventCheckInSchema.index({ expires_at: 1 });

// Method để kiểm tra QR code có còn hợp lệ không
eventCheckInSchema.methods.isValid = function () {
  if (!this.is_active) return false;
  if (new Date() > this.expires_at) return false;
  if (this.max_scans && this.scan_count >= this.max_scans) return false;
  return true;
};

// Method để check-in user
eventCheckInSchema.methods.checkInUser = function (userId, location = null, deviceInfo = null) {
  if (!this.isValid()) {
    throw new Error("QR code không còn hiệu lực");
  }

  // Kiểm tra user đã check-in chưa
  const alreadyCheckedIn = this.check_ins.some(
    (ci) => ci.user_id.toString() === userId.toString()
  );

  if (alreadyCheckedIn) {
    throw new Error("User đã check-in rồi");
  }

  // Chuẩn hóa payload để tránh CastError khi client gửi object
  let normalizedDeviceInfo = deviceInfo;
  if (deviceInfo && typeof deviceInfo !== "string") {
    try {
      normalizedDeviceInfo = JSON.stringify(deviceInfo);
    } catch (_) {
      normalizedDeviceInfo = String(deviceInfo);
    }
  }

  let normalizedLocation = null;
  if (location && typeof location === "object") {
    const latitude = Number(
      location.latitude !== undefined ? location.latitude : location.lat
    );
    const longitude = Number(
      location.longitude !== undefined ? location.longitude : location.lng
    );

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      normalizedLocation = { latitude, longitude };
    }
  }

  // Thêm check-in record
  this.check_ins.push({
    user_id: userId,
    checked_in_at: new Date(),
    location: normalizedLocation,
    device_info: normalizedDeviceInfo,
  });

  this.scan_count += 1;
  return this.save();
};

module.exports = mongoose.model("EventCheckIn", eventCheckInSchema);
