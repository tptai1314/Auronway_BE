const service = require("./events.service");

// Simple async wrapper to avoid try/catch duplication
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * =====================================
 *  EVENT CORE
 * =====================================
 */

// POST /events
const createEvent = asyncHandler(async (req, res) => {
  const event = await service.createEvent(req.user, req.body);
  res.status(201).json({
    success: true,
    message: "Tạo event thành công",
    data: event,
  });
});

// GET /events
const getEvents = asyncHandler(async (req, res) => {
  const events = await service.getEvents(req.query, req.user);
  res.status(200).json({
    success: true,
    data: events, // { page, limit, total, totalPages, items }
  });
});

// GET /events/:id
const getEventDetail = asyncHandler(async (req, res) => {
  const event = await service.getEventDetail(req.params.id);
  res.status(200).json({
    success: true,
    data: event,
  });
});

// PATCH /events/:id
const updateEvent = asyncHandler(async (req, res) => {
  const event = await service.updateEvent(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: "Cập nhật event thành công",
    data: event,
  });
});

// DELETE /events/:id
const cancelEvent = asyncHandler(async (req, res) => {
  const event = await service.cancelEvent(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: "Hủy event thành công",
    data: event,
  });
});

/**
 * =====================================
 *  REGISTRATION
 * =====================================
 */

// POST /events/:id/register
const registerEvent = asyncHandler(async (req, res) => {
  const registration = await service.registerEvent(req.user, req.params.id);
  res.status(201).json({
    success: true,
    message: "Đăng ký event thành công",
    data: registration,
  });
});

// DELETE /events/:id/register
const cancelRegistration = asyncHandler(async (req, res) => {
  const registration = await service.cancelRegistration(
    req.user,
    req.params.id
  );
  res.status(200).json({
    success: true,
    message: "Hủy đăng ký event thành công",
    data: registration,
  });
});

// GET /events/:id/registrations  (Event Manager xem danh sách)
const getEventRegistrations = asyncHandler(async (req, res) => {
  const registrations = await service.getEventRegistrations(
    req.params.id,
    req.user
  );
  res.status(200).json({
    success: true,
    data: registrations,
  });
});

// GET /events/:id/my-registration
const getMyRegistration = asyncHandler(async (req, res) => {
  const registration = await service.getMyRegistration(
    req.user,
    req.params.id
  );
  res.status(200).json({
    success: true,
    data: registration,
  });
});
// GET /me/events
const getMyEvents = asyncHandler(async (req, res) => {
  const events = await service.getMyEvents(req.user, req.query);
  res.status(200).json({
    success: true,
    data: events,
  });
});
/**
 * =====================================
 *  EVIDENCE + ATTENDANCE
 * =====================================
 */

// POST /events/:id/checkin
const checkinEvent = asyncHandler(async (req, res) => {
  const registration = await service.checkinEvent(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: "Check-in event thành công",
    data: registration,
  });
});

/**
 * =====================================
 *  QR CODE CHECK-IN
 * =====================================
 */

// POST /events/:id/qr-code (Tạo QR code cho event)
const generateEventQRCode = asyncHandler(async (req, res) => {
  const qrData = await service.generateEventQRCode(
    req.user,
    req.params.id,
    req.body
  );
  res.status(201).json({
    success: true,
    message: "Tạo QR code thành công",
    data: qrData,
  });
});

// GET /events/:id/qr-code (Lấy thông tin QR code)
const getEventQRCode = asyncHandler(async (req, res) => {
  const qrData = await service.getEventQRCode(req.user, req.params.id);
  res.status(200).json({
    success: true,
    data: qrData,
  });
});

// DELETE /events/:id/qr-code (Vô hiệu hóa QR code)
const deactivateEventQRCode = asyncHandler(async (req, res) => {
  const result = await service.deactivateEventQRCode(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// DELETE /events/:id/qr-code/delete (Xóa hoàn toàn QR code)
const deleteEventQRCode = asyncHandler(async (req, res) => {
  const result = await service.deleteEventQRCode(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// POST /events/qr-checkin (Check-in bằng QR code)
const checkinByQRCode = asyncHandler(async (req, res) => {
  const { qr_token, location, device_info } = req.body;
  
  if (!qr_token) {
    return res.status(400).json({
      success: false,
      message: "qr_token là bắt buộc",
    });
  }
  
  const result = await service.checkinByQRCode(
    req.user,
    qr_token,
    location,
    device_info
  );
  
  res.status(200).json({
    success: true,
    message: "Check-in bằng QR code thành công",
    data: result,
  });
});

module.exports = {
  // Event core
  createEvent,
  getEvents,
  getEventDetail,
  updateEvent,
  cancelEvent,

  // Registration
  registerEvent,
  cancelRegistration,
  getEventRegistrations,
  getMyRegistration,
  getMyEvents,

  // Check-in
  checkinEvent,
  
  // QR Code Check-in
  generateEventQRCode,
  getEventQRCode,
  deactivateEventQRCode,
  deleteEventQRCode,
  checkinByQRCode,
};
