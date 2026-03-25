const Event = require("../model/event.model");
const EventRegistration = require("../model/eventRegistration.model");

module.exports = async function authorizeRegistration(req, res, next) {
  try {
    const eventId = req.params.id;

    // 1. Tìm event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ msg: "Event không tồn tại" });
    }

    req.event = event; // chuẩn bị cho controller dùng

    const user = req.user;

    // 2. SUPER_ADMIN luôn được phép đăng ký
    if (user.roles?.includes("SUPER_ADMIN")) return next();

    // 3. Kiểm tra tenant (bắt buộc)
    if (user.tenant_id?.toString() !== event.tenant_id?.toString()) {
      return res.status(403).json({ msg: "Bạn không thuộc tenant của event này" });
    }

    // 4. Trạng thái không cho đăng ký
    const DENY_STATUSES = ["CANCELLED", "COMPLETED"];
    if (DENY_STATUSES.includes(event.status)) {
      return res.status(400).json({ msg: "Event đã đóng, không thể đăng ký" });
    }

    // 5. Kiểm tra thời gian đăng ký
    const now = new Date();

    if (event.registration_start && now < event.registration_start) {
      return res.status(400).json({ msg: "Chưa mở đăng ký" });
    }

    if (event.registration_end && now > event.registration_end) {
      return res.status(400).json({ msg: "Đã hết hạn đăng ký" });
    }

    // 6. Không cho đăng ký trùng
    const exists = await EventRegistration.findOne({
      event_id: eventId,
      user_id: user._id,
    });

    if (exists && !["CANCELLED", "NO_SHOW"].includes(exists.status)) {
      return res.status(400).json({ msg: "Bạn đã đăng ký event này rồi" });
    }

    // 7. Có thể thêm rule khác:
    // - Chặn học sinh campus A đăng ký event campus B
    // - Chặn user của tổ chức khác
    // - Giới hạn slot đăng ký

    return next();
  } catch (err) {
    console.error("authorizeRegistration error:", err);
    return res.status(500).json({ msg: "Lỗi server" });
  }
};
