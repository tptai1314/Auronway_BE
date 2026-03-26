const User = require("../../model/user.model");
const Event = require("../../model/event.model");
const EventRegistration = require("../../model/eventRegistration.model");
const Skill = require("../../model/skill.model");
const Avatar = require("../../model/avatar.model");
const bcrypt = require("bcryptjs");

// ===== ERROR HELPER =====
function throwError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeDateOfBirth(value) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwError("Ngày sinh không hợp lệ", 400);
  }

  return date;
}

function sanitizeProfile(profile = {}) {
  if (!profile || typeof profile !== "object") return {};

  return {
    ...profile,
    full_name: normalizeOptionalString(profile.full_name),
    avatar_url: normalizeOptionalString(profile.avatar_url),
    student_id: normalizeOptionalString(profile.student_id),
    major: normalizeOptionalString(profile.major),
    bio: normalizeOptionalString(profile.bio),
    phone: normalizeOptionalString(profile.phone),
    date_of_birth: normalizeDateOfBirth(profile.date_of_birth),
  };
}

function mapUserPersistenceError(error) {
  if (!error) return;

  if (error.code === 11000 && error.keyPattern?.email) {
    throwError("Email đã được sử dụng", 400);
  }

  if (error.name === "ValidationError" || error.name === "CastError") {
    throwError(error.message || "Dữ liệu người dùng không hợp lệ", 400);
  }
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
  const email = normalizeEmail(data.email);
  if (!email) {
    throwError("Email là bắt buộc", 400);
  }
  if (!data.password) {
    throwError("Mật khẩu là bắt buộc", 400);
  }

  // Check if email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throwError("Email đã được sử dụng", 400);
  }

  // Hash password if provided
  let password_hash = null;
  if (data.password) {
    password_hash = await bcrypt.hash(data.password, 10);
  }

  const profile = sanitizeProfile(data.profile || {});

  const user = new User({
    email,
    password_hash,
    profile,
    roles: ["PUBLIC_USER"],
    affiliations: [{ role: "STUDENT" }],
    is_active: data.is_active !== undefined ? data.is_active : true,
    auth_provider: "local",
  });

  try {
    await user.save();
  } catch (error) {
    mapUserPersistenceError(error);
    throw error;
  }

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
  if (data.email) {
    const normalizedEmail = normalizeEmail(data.email);
    if (!normalizedEmail) {
      throwError("Email không hợp lệ", 400);
    }
    if (normalizedEmail !== user.email) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        throwError("Email đã được sử dụng", 400);
      }
      user.email = normalizedEmail;
    }
  }

  // Update password if provided
  if (data.password) {
    user.password_hash = await bcrypt.hash(data.password, 10);
  }

  // Update profile
  if (data.profile) {
    const currentProfile = user.profile?.toObject ? user.profile.toObject() : (user.profile || {});
    user.profile = sanitizeProfile({ ...currentProfile, ...data.profile });
  }

  // Update status
  if (data.is_active !== undefined) {
    user.is_active = data.is_active;
  }

  try {
    await user.save();
  } catch (error) {
    mapUserPersistenceError(error);
    throw error;
  }

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

  await User.findByIdAndDelete(userId);

  return { message: "Đã xóa người dùng" };
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

// =====================================
// AVATAR MANAGEMENT
// =====================================

/**
 * Get all avatars with pagination and filters
 */
async function getAvatars(query) {
  await resequenceAvatars();

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.q) {
    filter.name = { $regex: query.q, $options: "i" };
  }

  if (query.status === "active") {
    filter.is_active = true;
  } else if (query.status === "inactive") {
    filter.is_active = false;
  }

  if (query.is_default === "true") {
    filter.is_default = true;
  } else if (query.is_default === "false") {
    filter.is_default = false;
  }

  const [items, total] = await Promise.all([
    Avatar.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Avatar.countDocuments(filter),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  };
}

async function resequenceAvatars() {
  const avatars = await Avatar.find({})
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .select("_id order")
    .lean();

  if (!avatars.length) return;

  const ops = [];
  avatars.forEach((avatar, index) => {
    const nextOrder = index + 1;
    if (avatar.order !== nextOrder) {
      ops.push({
        updateOne: {
          filter: { _id: avatar._id },
          update: { $set: { order: nextOrder } },
        },
      });
    }
  });

  if (ops.length) {
    await Avatar.bulkWrite(ops);
  }
}

async function moveAvatarToOrder(avatarId, rawOrder) {
  const avatars = await Avatar.find({})
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .select("_id order")
    .lean();

  const currentIndex = avatars.findIndex((a) => String(a._id) === String(avatarId));
  if (currentIndex < 0) {
    throwError("Avatar không tồn tại", 404);
  }

  const [movingItem] = avatars.splice(currentIndex, 1);
  const requested = Math.max(1, Math.floor(Number(rawOrder) || 1));
  const targetIndex = Math.min(requested - 1, avatars.length);
  avatars.splice(targetIndex, 0, movingItem);

  const ops = avatars.map((avatar, index) => ({
    updateOne: {
      filter: { _id: avatar._id },
      update: { $set: { order: index + 1 } },
    },
  }));

  if (ops.length) {
    await Avatar.bulkWrite(ops);
  }
}

/**
 * Create a system avatar
 */
async function createAvatar(data) {
  if (!data.name || !data.image_url) {
    throwError("Tên và URL ảnh là bắt buộc", 400);
  }

  const name = String(data.name).trim();
  const imageUrl = String(data.image_url).trim();

  if (!name || !imageUrl) {
    throwError("Tên và URL ảnh là bắt buộc", 400);
  }

  await resequenceAvatars();
  const total = await Avatar.countDocuments();

  if (data.is_default) {
    await Avatar.updateMany({}, { $set: { is_default: false } });
  }

  const avatar = await Avatar.create({
    name,
    image_url: imageUrl,
    is_default: Boolean(data.is_default),
    is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
    order: total + 1,
  });

  return avatar;
}

/**
 * Update avatar by ID
 */
async function updateAvatar(avatarId, data) {
  const avatar = await Avatar.findById(avatarId);
  if (!avatar) {
    throwError("Avatar không tồn tại", 404);
  }

  if (data.name !== undefined) avatar.name = String(data.name || "").trim();
  if (data.image_url !== undefined) avatar.image_url = String(data.image_url || "").trim();
  if (data.is_active !== undefined) avatar.is_active = Boolean(data.is_active);

  if (data.is_default !== undefined) {
    const nextDefault = Boolean(data.is_default);
    if (nextDefault) {
      await Avatar.updateMany({ _id: { $ne: avatarId } }, { $set: { is_default: false } });
    }
    avatar.is_default = nextDefault;
  }

  await avatar.save();

  if (data.order !== undefined && Number.isFinite(Number(data.order))) {
    await moveAvatarToOrder(avatarId, Number(data.order));
  } else {
    await resequenceAvatars();
  }

  return Avatar.findById(avatarId).lean();
}

/**
 * Delete avatar by ID
 */
async function deleteAvatar(avatarId) {
  const avatar = await Avatar.findById(avatarId);
  if (!avatar) {
    throwError("Avatar không tồn tại", 404);
  }

  await Avatar.findByIdAndDelete(avatarId);
  await resequenceAvatars();
  return { message: "Đã xóa avatar" };
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

  // Avatar management
  getAvatars,
  createAvatar,
  updateAvatar,
  deleteAvatar,
};
