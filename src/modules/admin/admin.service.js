const User = require("../../model/user.model");
const Event = require("../../model/event.model");
const EventRegistration = require("../../model/eventRegistration.model");
const Skill = require("../../model/skill.model");
const bcrypt = require("bcryptjs");

// ===== ERROR HELPER =====
function throwError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

// =====================================
// USER MANAGEMENT
// =====================================

/**
 * Get all users with pagination and filters
 */
async function getUsers(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};

  // Search by name or email
  if (query.q) {
    filter.$or = [
      { email: { $regex: query.q, $options: "i" } },
      { "profile.full_name": { $regex: query.q, $options: "i" } },
    ];
  }

  // Filter by role
  if (query.role) {
    filter.roles = query.role;
  }

  // Filter by status
  if (query.status === "active") {
    filter.is_active = true;
  } else if (query.status === "inactive") {
    filter.is_active = false;
  }

  // Filter by organizer_id (for club managers)
  if (query.organizer_id) {
    filter["affiliations.organizer_id"] = query.organizer_id;
  }

  // Filter by campus_id
  if (query.campus_id) {
    filter["affiliations.campus_id"] = query.campus_id;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash -google_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: users,
  };
}

/**
 * Get single user by ID
 */
async function getUserById(userId) {
  const user = await User.findById(userId)
    .select("-password_hash -google_id")
    .lean();

  if (!user) {
    throwError("Người dùng không tồn tại", 404);
  }

  return user;
}

/**
 * Create new user (admin)
 */
async function createUser(data) {
  // Check if email exists
  const existingUser = await User.findOne({ email: data.email });
  if (existingUser) {
    throwError("Email đã được sử dụng", 400);
  }

  // Hash password if provided
  let password_hash = null;
  if (data.password) {
    password_hash = await bcrypt.hash(data.password, 10);
  }

  const user = new User({
    email: data.email,
    password_hash,
    profile: data.profile || {},
    roles: data.roles || ["PUBLIC_USER"],
    is_active: data.is_active !== undefined ? data.is_active : true,
    auth_provider: "local",
  });

  await user.save();

  // Return without sensitive fields
  const result = user.toObject();
  delete result.password_hash;
  delete result.google_id;

  return result;
}

/**
 * Update user (admin)
 */
async function updateUser(userId, data) {
  const user = await User.findById(userId);
  if (!user) {
    throwError("Người dùng không tồn tại", 404);
  }

  // Check email uniqueness if changing email
  if (data.email && data.email !== user.email) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throwError("Email đã được sử dụng", 400);
    }
    user.email = data.email;
  }

  // Update password if provided
  if (data.password) {
    user.password_hash = await bcrypt.hash(data.password, 10);
  }

  // Update profile
  if (data.profile) {
    user.profile = { ...user.profile, ...data.profile };
  }

  // Update roles
  if (data.roles) {
    user.roles = data.roles;
  }

  // Update status
  if (data.is_active !== undefined) {
    user.is_active = data.is_active;
  }

  await user.save();

  // Return without sensitive fields
  const result = user.toObject();
  delete result.password_hash;
  delete result.google_id;

  return result;
}

/**
 * Toggle user active status
 */
async function toggleUserStatus(userId, is_active) {
  const user = await User.findById(userId);
  if (!user) {
    throwError("Người dùng không tồn tại", 404);
  }

  user.is_active = is_active;
  await user.save();

  const result = user.toObject();
  delete result.password_hash;
  delete result.google_id;

  return result;
}

/**
 * Delete user (soft delete by deactivating)
 */
async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throwError("Người dùng không tồn tại", 404);
  }

  // Soft delete - just deactivate
  user.is_active = false;
  await user.save();

  return { message: "Đã khóa người dùng" };
}

// =====================================
// DASHBOARD STATS
// =====================================

/**
 * Get dashboard statistics
 */
async function getDashboardStats() {
  const [
    totalEvents,
    activeEvents,
    totalUsers,
    totalRegistrations,
    checkedInCount,
  ] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: "APPROVED" }),
    User.countDocuments(),
    EventRegistration.countDocuments(),
    EventRegistration.countDocuments({ status: "ATTENDED" }),
  ]);

  return {
    totalEvents,
    activeEvents,
    totalUsers,
    totalRegistrations,
    checkedInCount,
  };
}

// =====================================
// EVENT MANAGEMENT (admin overrides)
// =====================================

/**
 * Admin get all events (no permission check)
 */
async function getAllEvents(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.type && query.type !== "all") {
    filter.type = query.type;
  }

  if (query.q) {
    filter.$or = [
      { title: { $regex: query.q, $options: "i" } },
      { description: { $regex: query.q, $options: "i" } },
    ];
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate("campus_id", "name")
      .populate("organizer_id", "name")
      .populate("skills.skill_id", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: events,
  };
}

/**
 * Admin update event status
 */
async function updateEventStatus(eventId, status) {
  const event = await Event.findById(eventId);
  if (!event) {
    throwError("Sự kiện không tồn tại", 404);
  }

  event.status = status;
  await event.save();

  return event;
}

/**
 * Admin delete event (hard delete)
 */
async function deleteEvent(eventId) {
  const event = await Event.findById(eventId);
  if (!event) {
    throwError("Sự kiện không tồn tại", 404);
  }

  // Delete all registrations for this event
  await EventRegistration.deleteMany({ event_id: eventId });

  // Delete event
  await Event.findByIdAndDelete(eventId);

  return { message: "Đã xóa sự kiện" };
}

/**
 * Get all active skills for event creation
 */
async function getAllSkills() {
  const skills = await Skill.find({ is_active: true })
    .populate("category_id", "name label_vi")
    .select("_id name label_vi code category_id")
    .sort({ name: 1 })
    .lean();
  return skills;
}

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

  // Skills
  getAllSkills,
};
