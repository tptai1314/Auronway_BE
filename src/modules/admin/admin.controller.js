const service = require("./admin.service");
const cloudinaryService = require("../../utils/cloudinary.service");

// Simple async wrapper
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// =====================================
// USER MANAGEMENT
// =====================================

// GET /admin/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await service.getUsers(req.query);
  res.status(200).json({
    success: true,
    data: users,
  });
});

// GET /admin/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  res.status(200).json({
    success: true,
    data: user,
  });
});

// POST /admin/users
const createUser = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body);
  res.status(201).json({
    success: true,
    message: "Tạo người dùng thành công",
    data: user,
  });
});

// PATCH /admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await service.updateUser(req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: "Cập nhật người dùng thành công",
    data: user,
  });
});

// PATCH /admin/users/:id/status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await service.toggleUserStatus(req.params.id, req.body.is_active);
  res.status(200).json({
    success: true,
    message: req.body.is_active ? "Đã mở khóa người dùng" : "Đã khóa người dùng",
    data: user,
  });
});

// DELETE /admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const result = await service.deleteUser(req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// =====================================
// DASHBOARD
// =====================================

// GET /admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await service.getDashboardStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

// =====================================
// EVENT MANAGEMENT
// =====================================

// GET /admin/events
const getAllEvents = asyncHandler(async (req, res) => {
  const events = await service.getAllEvents(req.query);
  res.status(200).json({
    success: true,
    data: events,
  });
});

// PATCH /admin/events/:id/status
const updateEventStatus = asyncHandler(async (req, res) => {
  const event = await service.updateEventStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: "Cập nhật trạng thái thành công",
    data: event,
  });
});

// DELETE /admin/events/:id
const deleteEvent = asyncHandler(async (req, res) => {
  const result = await service.deleteEvent(req.params.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// =====================================
// IMAGE UPLOAD
// =====================================

// POST /admin/upload-image
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const result = await cloudinaryService.uploadImage(
    req.file.buffer,
    "event-covers"
  );

  res.json({
    success: true,
    data: {
      url: result.url,
      public_id: result.public_id,
    },
  });
});

// =====================================
// SKILLS
// =====================================

// GET /admin/skills
const getAllSkills = asyncHandler(async (req, res) => {
  const skills = await service.getAllSkills();
  res.json({
    success: true,
    data: skills,
  });
});

module.exports = {
  // User management
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,

  // Dashboard
  getDashboardStats,

  // Event management
  getAllEvents,
  updateEventStatus,
  deleteEvent,

  // Upload
  uploadImage,

  // Skills
  getAllSkills,
};
