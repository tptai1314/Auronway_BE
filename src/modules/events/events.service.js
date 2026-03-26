// services/events.service.js

// ===== IMPORTS =====
const Event = require("../../model/event.model");
const EventRegistration = require("../../model/eventRegistration.model");
const EventCheckIn = require("../../model/eventCheckIn.model");
const User = require("../../model/user.model");
const UserSkill = require("../../model/userSkill.model");
const UserSkillCategory = require("../../model/userSkillCategory.model");
const XPLedger = require("../../model/xpLedger.model");
const crypto = require("crypto");

const dailyService = require("../daily/daily.service");
const xpLedgerService = require("../xp/xpLedger.service");
const { calculateLevelFromXp } = require("../skills/skill.constants");
const { updateUserLevel } = require("../../utils/user.level.config");

// ===== CONSTANTS =====
const STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  CANCELLED: "CANCELLED"
};

const REGISTRATION_STATUS = {
  REGISTERED: "REGISTERED",
  ATTENDED: "ATTENDED",
  CANCELLED: "CANCELLED"
};

const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  TENANT_ADMIN: "TENANT_ADMIN",
  CAMPUS_ADMIN: "CAMPUS_ADMIN",
  EVENT_MANAGER: "EVENT_MANAGER",
  CLUB_ADMIN: "CLUB_ADMIN",
};

// ===== ERROR HELPER =====
function throwError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

// ===== VALIDATION HELPERS =====
function validateRequiredFields(data, fields) {
  const missingFields = fields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throwError(`Thiếu trường bắt buộc: ${missingFields.join(", ")}`, 422);
  }
}

function validateEventTiming(startAt, endAt) {
  if (new Date(startAt) >= new Date(endAt)) {
    throwError("start_at phải nhỏ hơn end_at", 422);
  }
}

// ===== DATA LOADERS =====
async function loadEventOrThrow(eventId) {
  const event = await Event.findById(eventId);
  if (!event) throwError("Event không tồn tại", 404);
  return event;
}

async function loadRegistrationOrThrow(filter) {
  const registration = await EventRegistration.findOne(filter);
  if (!registration) throwError("Đăng ký không tồn tại", 404);
  return registration;
}

// ===== PERMISSION HELPERS =====
function checkEventManagerPermission(user, event) {
  if (user.roles?.includes(ROLES.SUPER_ADMIN)) return true;

  // TENANT_ADMIN có quyền với mọi event trong cùng tenant
  if (user.roles?.includes(ROLES.TENANT_ADMIN)) {
    const isSameTenant =
      user.tenant_id?.toString() === event.tenant_id?.toString();
    if (isSameTenant) return true;
  }
  
  // Check CAMPUS_ADMIN (system role) có quyền với event của campus họ
  // CAMPUS_ADMIN là system role, lấy campus từ affiliations hoặc tenant từ user
  if (user.roles?.includes(ROLES.CAMPUS_ADMIN)) {
    // Tìm campus mà user này quản lý
    const userCampusAffiliation = user.affiliations?.find(
      (a) => a.campus_id && 
             a.tenant_id?.toString() === event.tenant_id?.toString() &&
             a.campus_id?.toString() === event.campus_id?.toString()
    );
    
    // Hoặc check nếu user có tenant_id match với event
    const isSameTenant = user.tenant_id?.toString() === event.tenant_id?.toString();
    
    if (userCampusAffiliation || isSameTenant) return true;
  }
  
  // Check EVENT_MANAGER (affiliation role)
  const hasEventManager = user.affiliations?.some(
    (a) =>
      a.role === ROLES.EVENT_MANAGER &&
      a.tenant_id?.toString() === event.tenant_id?.toString() &&
      (!a.campus_id || a.campus_id?.toString() === event.campus_id?.toString()) &&
      (!a.organizer_id || a.organizer_id?.toString() === event.organizer_id?.toString())
  );
  if (hasEventManager) return true;
  
  // Check CLUB_ADMIN (affiliation role) có quyền với event của club họ
  const hasClubAdmin = user.affiliations?.some(
    (a) =>
      a.role === ROLES.CLUB_ADMIN &&
      a.organizer_id?.toString() === event.organizer_id?.toString()
  );
  if (hasClubAdmin) return true;
  
  return false;
}


function getTenantIdFromUser(user, eventData = null) {
  // TENANT_ADMIN: dùng tenant_id hệ thống
  if (user.roles?.includes(ROLES.TENANT_ADMIN) && user.tenant_id) {
    return user.tenant_id;
  }

  // Tìm tenant_id từ affiliations của EVENT_MANAGER
  if (eventData) {
    const managerAffiliation = user.affiliations?.find(
      (a) =>
        [ROLES.EVENT_MANAGER, ROLES.CLUB_ADMIN].includes(a.role) &&
        (!a.campus_id || a.campus_id?.toString() === eventData.campus_id?.toString()) &&
        a.organizer_id?.toString() === eventData.organizer_id?.toString()
    );
    
    if (managerAffiliation?.tenant_id) {
      return managerAffiliation.tenant_id;
    }
  }
  
  // Fallback
  return user.tenant_id || null;
}

// ===== CACHE MANAGEMENT =====
const eventsCache = new Map();
const EVENTS_CACHE_TTL_MS = 30 * 1000;

function getCachedEvents(key) {
  const entry = eventsCache.get(key);
  if (!entry) return null;
  
  if (entry.expiresAt < Date.now()) {
    eventsCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedEvents(key, data) {
  eventsCache.set(key, {
    data,
    expiresAt: Date.now() + EVENTS_CACHE_TTL_MS,
  });
}

function clearEventsCache() {
  eventsCache.clear();
}

// ===== EVENT STATS MANAGEMENT =====
async function updateEventStats(event, operation, value = 1) {
  if (operation === "registered") {
    event.registered_count = Math.max(0, (event.registered_count || 0) + value);
  } else if (operation === "attended") {
    event.attended_count = Math.max(0, (event.attended_count || 0) + value);
  }
  await event.save();
}

// ===== QUEST PROGRESS HELPER =====
async function updateQuestProgressSafely(userId, questType, value = 1) {
  try {
    await dailyService.increaseProgress(userId, questType, value);
  } catch (err) {
    console.error(`Error updating quest progress for ${questType}:`, err);
  }
}

// ======================================
// EVENT CORE SERVICES
// ======================================

async function createEvent(user, data) {
  // Validation
  validateRequiredFields(data, [
    "title",
    "type",
    "start_at",
    "end_at",
    "campus_id",
    "organizer_id",
  ]);
  
  validateEventTiming(data.start_at, data.end_at);
  
  // Get tenant_id
  const tenantId = getTenantIdFromUser(user, data);
  if (!tenantId) {
    throwError("Không xác định được tenant_id từ affiliations", 403);
  }
  
  // Create event
  const event = new Event({
    ...data,
    created_by: user._id,
    tenant_id: tenantId,
    status: STATUS.DRAFT,
    registered_count: 0,
    attended_count: 0,
  });
  
  await event.save();
  clearEventsCache(); // Invalidate cache
  return event;
}

async function getEvents(query, user) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  const filterFields = ["campus_id", "organizer_id", "type", "status"];
  filterFields.forEach(field => {
    if (query[field]) filter[field] = query[field];
  });
  
  // Search query
  if (query.q) {
    filter.$or = [
      { title: { $regex: query.q, $options: "i" } },
      { description: { $regex: query.q, $options: "i" } }
    ];
  }
  
  // Time-based filter: upcoming, ongoing, past
  const now = new Date();
  if (query.time === 'upcoming') {
    filter.start_at = { $gt: now };
  } else if (query.time === 'ongoing') {
    filter.start_at = { $lte: now };
    filter.end_at = { $gte: now };
  } else if (query.time === 'past') {
    filter.end_at = { $lt: now };
  }
  
  // Apply tenant filter for non-super-admin users
  if (user && !user.roles?.includes(ROLES.SUPER_ADMIN)) {
    const tenantIds = user.affiliations
      ?.map(a => a.tenant_id?.toString())
      .filter(Boolean);
    
    if (tenantIds && tenantIds.length > 0) {
      filter.tenant_id = { $in: tenantIds };
    }
  }
  
  // Cache key
  const cacheKey = JSON.stringify({ 
    page, 
    limit, 
    filter,
    time: query.time,
    my_status: query.my_status,
    userId: user?._id?.toString() || 'anonymous'
  });
  
  // Try cache first
  const cached = getCachedEvents(cacheKey);
  if (cached) return cached;
  
  // Database query
  let items = await Event.find(filter)
    .populate("organizer_id", "name logo contact")
    .sort({ start_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  let total = await Event.countDocuments(filter);
  
  // Filter events based on organizer privacy settings
  // Chỉ hiển thị events của CLB private nếu user là thành viên
  if (user) {
    const Organizer = require("../../model/organizer.model");
    // Filter out events with null organizer_id
    const validOrganizers = items.filter(e => e.organizer_id).map(e => {
      // After populate, organizer_id can be an object or string
      return typeof e.organizer_id === 'object' && e.organizer_id._id 
        ? e.organizer_id._id.toString() 
        : (e.organizer_id ? e.organizer_id.toString() : null);
    }).filter(id => id !== null);
    
    const organizerIds = [...new Set(validOrganizers)];
    const organizers = await Organizer.find({ 
      _id: { $in: organizerIds },
      is_private: true 
    }).lean();
    
    // Map organizer_id -> organizer
    const privateOrganizerMap = new Map(
      organizers.map(o => [o._id.toString(), o])
    );
    
    // Filter out events from private organizers where user is not a member
    items = items.filter(event => {
      if (!event.organizer_id) return true; // Keep events without organizer
      
      // Get organizer ID string (handle both object and string)
      const orgId = typeof event.organizer_id === 'object' && event.organizer_id._id
        ? event.organizer_id._id.toString()
        : event.organizer_id.toString();
      
      const org = privateOrganizerMap.get(orgId);
      
      // Nếu không phải private organizer, cho phép xem
      if (!org) return true;
      
      // Nếu là manager, cho phép xem
      if (org.manager_id && org.manager_id.toString() === user._id.toString()) {
        return true;
      }
      
      // Nếu là member, cho phép xem
      const isMember = org.members?.some(
        m => m.user_id.toString() === user._id.toString()
      );
      
      return isMember;
    });
    
    // Update total count after filtering
    total = items.length;
  }
  
  // Filter by registration status if user is logged in
  if (user && query.my_status) {
    // Get all user's registrations for these events
    const eventIds = items.map(e => e._id);
    const registrations = await EventRegistration.find({
      user_id: user._id,
      event_id: { $in: eventIds },
      status: { $ne: REGISTRATION_STATUS.CANCELLED }
    }).lean();
    
    const registeredEventIds = new Set(
      registrations.map(r => r.event_id.toString())
    );
    
    if (query.my_status === 'registered') {
      // Only show events user has registered for
      items = items.filter(e => registeredEventIds.has(e._id.toString()));
    } else if (query.my_status === 'not_registered') {
      // Only show events user hasn't registered for
      items = items.filter(e => !registeredEventIds.has(e._id.toString()));
    }
    
    // Update total count after filtering
    total = items.length;
  }
  
  // Add registration status to each event if user is logged in
  if (user) {
    const eventIds = items.map(e => e._id);
    const registrations = await EventRegistration.find({
      user_id: user._id,
      event_id: { $in: eventIds }
    })
      .select('event_id status registered_at attended_at xp_awarded')
      .lean();
    
    const regMap = new Map(
      registrations.map(r => [r.event_id.toString(), r])
    );
    
    items = items.map(event => ({
      ...event,
      my_registration: regMap.get(event._id.toString()) || null,
      is_registered: regMap.has(event._id.toString()) && 
        regMap.get(event._id.toString())?.status !== REGISTRATION_STATUS.CANCELLED
    }));
  }
  
  const result = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items,
  };
  
  // Cache result
  setCachedEvents(cacheKey, result);
  return result;
}

async function getEventDetail(id) {
  const event = await Event.findById(id)
    .populate("skills.skill_id", "code name")
    .populate("organizer_id", "name logo contact")
    .lean();
  
  if (!event) throwError("Event không tồn tại", 404);
  return event;
}

async function updateEvent(id, data, user) {
  const event = await loadEventOrThrow(id);
  const isTenantOrSuperAdmin =
    user.roles?.includes(ROLES.SUPER_ADMIN) ||
    user.roles?.includes(ROLES.TENANT_ADMIN);

  // Chỉ TENANT_ADMIN hoặc SUPER_ADMIN được phép thay đổi trạng thái event
  if (
    data.status &&
    data.status !== event.status &&
    !isTenantOrSuperAdmin
  ) {
    throwError("Chỉ Tenant Admin mới có quyền chỉnh sửa trạng thái sự kiện", 403);
  }
  
  // Event đã hủy chỉ TENANT_ADMIN/SUPER_ADMIN mới được phép cập nhật.
  // Các role khác vẫn bị chặn để tránh chỉnh sửa sai luồng nghiệp vụ.
  if (
    event.status === STATUS.CANCELLED &&
    !isTenantOrSuperAdmin &&
    data.status !== STATUS.CANCELLED
  ) {
    throwError("Không thể cập nhật event đã hủy", 400);
  }
  
  // Remove sensitive fields
  const forbiddenFields = ["created_by", "tenant_id", "_id", "stats"];
  forbiddenFields.forEach(field => delete data[field]);
  
  // Validate timing if provided
  if (data.start_at && data.end_at) {
    validateEventTiming(data.start_at, data.end_at);
  }
  
  // Update event
  Object.assign(event, data);
  await event.save();
  clearEventsCache();
  
  return event;
}

async function cancelEvent(id, user) {
  const event = await loadEventOrThrow(id);
  
  if (event.status === STATUS.CANCELLED) {
    throwError("Event đã bị hủy trước đó", 400);
  }
  
  event.status = STATUS.CANCELLED;
  await event.save();
  clearEventsCache();
  
  return event;
}

// ======================================
// EVENT REGISTRATION SERVICES
// ======================================

async function registerEvent(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  // Check event status
  if ([STATUS.CANCELLED, STATUS.COMPLETED].includes(event.status)) {
    throwError("Event đã đóng, không thể đăng ký", 400);
  }
  
  // Check existing registration
  const existingReg = await EventRegistration.findOne({
    event_id: eventId,
    user_id: user._id,
  });
  
  let registration;
  let shouldIncrementStats = false;
  
  if (existingReg) {
    if (existingReg.status !== REGISTRATION_STATUS.CANCELLED) {
      throwError("Bạn đã đăng ký event này rồi", 409);
    }
    
    // Re-register from cancelled
    shouldIncrementStats = true;
    
    existingReg.status = REGISTRATION_STATUS.REGISTERED;
    existingReg.registered_at = new Date();
    existingReg.attended_at = undefined;
    existingReg.xp_awarded = false;
    
    await existingReg.save();
    registration = existingReg;
  } else {
    // New registration
    shouldIncrementStats = true;
    
    registration = new EventRegistration({
      event_id: eventId,
      user_id: user._id,
      status: REGISTRATION_STATUS.REGISTERED,
      registered_at: new Date(),
    });
    
    await registration.save();
  }
  
  // Update stats if needed
  if (shouldIncrementStats) {
    await updateEventStats(event, "registered", 1);
  }
  
  // Update quest progress
  await updateQuestProgressSafely(user._id, "EVENT_REGISTER", 1);
  
  return registration;
}

async function cancelRegistration(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  const registration = await loadRegistrationOrThrow({
    event_id: eventId,
    user_id: user._id,
  });
  
  // Check registration status
  if (registration.status === REGISTRATION_STATUS.CANCELLED) {
    throwError("Bạn đã hủy đăng ký event này rồi", 400);
  }
  
  if (registration.status === REGISTRATION_STATUS.ATTENDED) {
    throwError("Không thể hủy đăng ký đã check-in", 400);
  }
  
  // Decrease registered_count if currently registered
  if (registration.status === REGISTRATION_STATUS.REGISTERED) {
    await updateEventStats(event, "registered", -1);
  }
  
  registration.status = REGISTRATION_STATUS.CANCELLED;
  await registration.save();
  
  return registration;
}

async function getEventRegistrations(eventId, user) {
  const event = await loadEventOrThrow(eventId);
  
  // Check permission
  if (!checkEventManagerPermission(user, event)) {
    throwError("Bạn không có quyền xem danh sách đăng ký event này", 403);
  }
  
  // Aggregate with user info
  return await EventRegistration.aggregate([
    { $match: { event_id: event._id } },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 1,
        event_id: 1,
        user_id: 1,
        status: 1,
        registered_at: 1,
        attended_at: 1,
        xp_awarded: 1,
        created_at: 1,
        "user.email": 1,
        "user.profile.full_name": 1,
        "user.profile.student_id": 1,
      },
    },
    { $sort: { created_at: 1 } },
  ]);
}

async function getMyRegistration(user, eventId) {
  await loadEventOrThrow(eventId); // Verify event exists
  return await EventRegistration.findOne({
    event_id: eventId,
    user_id: user._id,
  });
}

async function getMyEvents(user, query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  
  // Build registration filter
  const regFilter = { user_id: user._id };
  
  // Filter by registration status
  if (query.status) {
    const statuses = query.status.split(',').map(s => s.trim());
    regFilter.status = { $in: statuses };
  }
  
  // Get registrations with event details
  const registrations = await EventRegistration.find(regFilter)
    .populate({
      path: 'event_id',
      select: 'title description type status start_at end_at campus_id organizer_id location cover_image_url',
    })
    .sort({ registered_at: -1 })
    .lean();
  
  // Filter by time (upcoming/past) on events
  let filteredRegs = registrations.filter(reg => reg.event_id); // Remove null events
  
  if (query.time === 'upcoming') {
    const now = new Date();
    filteredRegs = filteredRegs.filter(reg => new Date(reg.event_id.end_at) >= now);
  } else if (query.time === 'past') {
    const now = new Date();
    filteredRegs = filteredRegs.filter(reg => new Date(reg.event_id.end_at) < now);
  }
  
  // Paginate
  const total = filteredRegs.length;
  const items = filteredRegs.slice(skip, skip + limit);
  
  // Transform response
  const events = items.map(reg => ({
    event: reg.event_id,
    registration: {
      _id: reg._id,
      status: reg.status,
      registered_at: reg.registered_at,
      attended_at: reg.attended_at,
      xp_awarded: reg.xp_awarded,
    },
  }));
  
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    items: events,
  };
}

// ======================================
// CHECK-IN SERVICE
// ======================================

async function checkinEvent(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  // Validate event status
  if (event.status === STATUS.CANCELLED) {
    throwError("Event đã bị hủy, không thể check-in", 400);
  }
  
  // Validate timing - cho phép check-in từ khi event bắt đầu đến 2 giờ sau khi kết thúc
  const now = new Date();
  const startTime = new Date(event.start_at);
  const endTime = new Date(event.end_at);
    const checkinDeadline = new Date(endTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after end
    const earlyCheckinMinutes = 15;
    const checkinOpenTime = new Date(startTime.getTime() - earlyCheckinMinutes * 60 * 1000);
  
    if (now < checkinOpenTime) {
    throwError("Chưa đến thời gian check-in", 400);
  }
  
  if (now > checkinDeadline) {
    throwError("Đã quá thời gian check-in", 400);
  }
  
  const registration = await loadRegistrationOrThrow({
    event_id: eventId,
    user_id: user._id,
  });
  
  // Check registration status
  if (registration.status === REGISTRATION_STATUS.CANCELLED) {
    throwError("Bạn đã hủy đăng ký event này", 400);
  }
  
  // Check if already attended
  if (registration.status === REGISTRATION_STATUS.ATTENDED) {
    throwError("Bạn đã check-in event này rồi", 400);
  }
  
  // Update registration status
  registration.status = REGISTRATION_STATUS.ATTENDED;
  registration.attended_at = new Date();
  
  // Award XP if not already awarded
  if (!registration.xp_awarded && event.skills && event.skills.length > 0) {
    // Populate skills để lấy skill_id
    await event.populate('skills.skill_id');
    
    // Cộng XP vào User.skills và User.total_xp
    let totalXP = 0;
    const categoryXpDelta = {}; // category_id → xp tăng
    
    for (const skillReward of event.skills) {
      const skill = skillReward.skill_id;
      if (!skill) continue;
      
      const xpAmount = skillReward.xp_reward || 0;
      if (xpAmount <= 0) continue;
      
      totalXP += xpAmount;
      
      // Update hoặc tạo UserSkill
      let userSkill = await UserSkill.findOne({
        user_id: user._id,
        skill_id: skill._id,
      });
      
      if (!userSkill) {
        userSkill = new UserSkill({
          user_id: user._id,
          skill_id: skill._id,
          total_xp: 0,
        });
      }
      
      const oldXp = userSkill.total_xp;
      userSkill.total_xp += xpAmount;
      const levelInfo = calculateLevelFromXp(userSkill.total_xp);
      userSkill.level_index = levelInfo.level_index;
      userSkill.level_code = levelInfo.level_code;
      userSkill.progress = levelInfo.progress;
      await userSkill.save();
      
      // Track category XP
      const catId = skill.category_id.toString();
      categoryXpDelta[catId] = (categoryXpDelta[catId] || 0) + xpAmount;
    }
    
    // Update UserSkillCategory
    for (const [categoryId, xpDelta] of Object.entries(categoryXpDelta)) {
      let userCat = await UserSkillCategory.findOne({
        user_id: user._id,
        category_id: categoryId,
      });
      
      const oldXp = userCat ? userCat.total_xp : 0;
      const newTotalXp = oldXp + xpDelta;
      const levelInfo = calculateLevelFromXp(newTotalXp);
      
      if (!userCat) {
        userCat = new UserSkillCategory({
          user_id: user._id,
          category_id: categoryId,
          total_xp: newTotalXp,
          level_index: levelInfo.level_index,
          level_code: levelInfo.level_code,
        });
      } else {
        userCat.total_xp = newTotalXp;
        userCat.level_index = levelInfo.level_index;
        userCat.level_code = levelInfo.level_code;
      }
      
      await userCat.save();
    }
    
    // Update User.total_xp và tự động cập nhật level
    const userDoc = await User.findById(user._id);
    if (userDoc) {
      userDoc.stats = userDoc.stats || {};
      userDoc.stats.total_xp = (userDoc.stats.total_xp || 0) + totalXP;
      
      // Tự động cập nhật level dựa trên total_xp mới
      updateUserLevel(userDoc);
      
      await userDoc.save();
    }
    
    // Create XPLedger entry
    const skill_breakdown = event.skills
      .filter(s => s.skill_id && s.xp_reward > 0)
      .map(s => ({
        skill_id: s.skill_id._id,
        skill_name: s.skill_id.name || s.skill_id.code,
        xp_amount: s.xp_reward,
        level_before: 1, // TODO: track actual level before
        level_after: 1,  // TODO: track actual level after
      }));
    
    const xpLedger = new XPLedger({
      user_id: user._id,
      campus_id: event.campus_id,
      source_type: 'EVENT_COMPLETION',
      source_id: event._id,
      source_name: event.title,
      base_xp: totalXP,
      final_xp: totalXP,
      skill_breakdown,
      organizer_id: event.organizer_id,
      description: `Check-in event ${event.title}`,
      effective_date: new Date(),
    });
    await xpLedger.save();
    

    // Mark XP as awarded
    registration.xp_awarded = true;
  }
  
  await registration.save();
  
  // Update event stats
  await updateEventStats(event, "attended", 1);
  
  // Update quest progress
  await updateQuestProgressSafely(user._id, "EVENT_ATTEND", 1);
  
  return registration;
}


// ======================================
// QR CODE CHECK-IN SERVICES
// ======================================

/**
 * Tạo QR code cho event để check-in
 * Chỉ EVENT_MANAGER của organizer có thể tạo
 */
async function generateEventQRCode(user, eventId, options = {}) {
  const event = await loadEventOrThrow(eventId);
  
  // Check permission - chỉ EVENT_MANAGER của organizer này được tạo QR
  if (!checkEventManagerPermission(user, event)) {
    throwError("Bạn không có quyền tạo QR code cho event này", 403);
  }
  
  // Validate event status
  if (event.status === STATUS.CANCELLED) {
    throwError("Không thể tạo QR code cho event đã hủy", 400);
  }
  
  // Tạo token ngẫu nhiên
  const qrToken = crypto.randomBytes(32).toString("hex");
  
    // Thời gian hết hạn QR code
    // - Nếu client truyền expires_in_hours thì ưu tiên dùng
    // - Nếu không, mặc định dùng mốc lớn hơn giữa:
    //   + hiện tại + 24h
    //   + thời điểm event kết thúc + 2h (để QR không hết hạn trước giờ diễn ra)
    const customExpiresInHours = Number(options.expires_in_hours);
    let expiresAt;

    if (Number.isFinite(customExpiresInHours) && customExpiresInHours > 0) {
      expiresAt = new Date(Date.now() + customExpiresInHours * 60 * 60 * 1000);
    } else {
      const default24h = Date.now() + 24 * 60 * 60 * 1000;
      const eventEndPlus2h = new Date(event.end_at).getTime() + 2 * 60 * 60 * 1000;
      expiresAt = new Date(Math.max(default24h, eventEndPlus2h));
    }
  
  // Kiểm tra xem đã có QR code chưa
  let qrCheckIn = await EventCheckIn.findOne({ event_id: eventId });
  
  if (qrCheckIn) {
    // Update existing QR code
    qrCheckIn.qr_code_token = qrToken;
    qrCheckIn.expires_at = expiresAt;
    qrCheckIn.is_active = true;
    qrCheckIn.max_scans = options.max_scans || null;
    qrCheckIn.scan_count = 0;
    qrCheckIn.check_ins = []; // Reset check-ins
  } else {
    // Create new QR code
    qrCheckIn = new EventCheckIn({
      event_id: eventId,
      qr_code_token: qrToken,
      expires_at: expiresAt,
      is_active: true,
      max_scans: options.max_scans || null,
      created_by: user._id,
    });
  }
  
  await qrCheckIn.save();
  
  // Update event
  event.qr_checkin_enabled = true;
  event.qr_code_token = qrToken;
  event.qr_expires_at = expiresAt;
  await event.save();
  
  return {
    event_id: eventId,
    qr_code_token: qrToken,
    expires_at: expiresAt,
    max_scans: qrCheckIn.max_scans,
    scan_count: qrCheckIn.scan_count,
  };
}

/**
 * Check-in bằng QR code
 * User quét QR và gửi token lên để check-in
 */
async function checkinByQRCode(user, qrToken, location = null, deviceInfo = null) {
  // Tìm QR code
  const qrCheckIn = await EventCheckIn.findOne({ 
    qr_code_token: qrToken 
  }).populate('event_id');
  
  if (!qrCheckIn) {
    throwError("QR code không hợp lệ", 404);
  }
  
  // Kiểm tra QR code còn hiệu lực không
  if (!qrCheckIn.isValid()) {
    throwError("QR code đã hết hạn hoặc không còn hiệu lực", 400);
  }
  
  const event = qrCheckIn.event_id;
  
  // Validate event status
  if (event.status === STATUS.CANCELLED) {
    throwError("Event đã bị hủy", 400);
  }
  
  // Validate timing
  const now = new Date();
  const startTime = new Date(event.start_at);
  const endTime = new Date(event.end_at);
  const checkinDeadline = new Date(endTime.getTime() + 2 * 60 * 60 * 1000);
  const earlyCheckinMinutes = 1500;
  const checkinOpenTime = new Date(startTime.getTime() - earlyCheckinMinutes * 60 * 1000);
  
  if (now < checkinOpenTime) {
    throwError("Chưa đến thời gian check-in", 400);
  }
  
  if (now > checkinDeadline) {
    throwError("Đã quá thời gian check-in", 400);
  }
  
  // Tìm registration của user
  const registration = await EventRegistration.findOne({
    event_id: event._id,
    user_id: user._id,
  });
  
  if (!registration) {
    throwError("Bạn chưa đăng ký event này", 400);
  }
  
  if (registration.status === REGISTRATION_STATUS.CANCELLED) {
    throwError("Bạn đã hủy đăng ký event này", 400);
  }
  
  if (registration.status === REGISTRATION_STATUS.ATTENDED) {
    throwError("Bạn đã check-in event này rồi", 400);
  }
  
  // Check-in user vào QR code
  try {
    await qrCheckIn.checkInUser(user._id, location, deviceInfo);
  } catch (err) {
    throwError(err.message, 400);
  }
  
  // Update registration status (sử dụng lại logic từ checkinEvent)
  registration.status = REGISTRATION_STATUS.ATTENDED;
  registration.attended_at = new Date();
  
  // Award XP (tái sử dụng logic từ checkinEvent)
  if (!registration.xp_awarded && event.skills && event.skills.length > 0) {
    await event.populate('skills.skill_id');
    
    let totalXP = 0;
    const categoryXpDelta = {};
    
    for (const skillReward of event.skills) {
      const skill = skillReward.skill_id;
      if (!skill) continue;
      
      const xpAmount = skillReward.xp_reward || 0;
      if (xpAmount <= 0) continue;
      
      totalXP += xpAmount;
      
      let userSkill = await UserSkill.findOne({
        user_id: user._id,
        skill_id: skill._id,
      });
      
      if (!userSkill) {
        userSkill = new UserSkill({
          user_id: user._id,
          skill_id: skill._id,
          total_xp: 0,
        });
      }
      
      userSkill.total_xp += xpAmount;
      const levelInfo = calculateLevelFromXp(userSkill.total_xp);
      userSkill.level_index = levelInfo.level_index;
      userSkill.level_code = levelInfo.level_code;
      userSkill.progress = levelInfo.progress;
      await userSkill.save();
      
      const catId = skill.category_id.toString();
      categoryXpDelta[catId] = (categoryXpDelta[catId] || 0) + xpAmount;
    }
    
    for (const [categoryId, xpDelta] of Object.entries(categoryXpDelta)) {
      let userCat = await UserSkillCategory.findOne({
        user_id: user._id,
        category_id: categoryId,
      });
      
      const oldXp = userCat ? userCat.total_xp : 0;
      const newTotalXp = oldXp + xpDelta;
      const levelInfo = calculateLevelFromXp(newTotalXp);
      
      if (!userCat) {
        userCat = new UserSkillCategory({
          user_id: user._id,
          category_id: categoryId,
          total_xp: newTotalXp,
          level_index: levelInfo.level_index,
          level_code: levelInfo.level_code,
        });
      } else {
        userCat.total_xp = newTotalXp;
        userCat.level_index = levelInfo.level_index;
        userCat.level_code = levelInfo.level_code;
      }
      
      await userCat.save();
    }
    
    const userDoc = await User.findById(user._id);
    if (userDoc) {
      userDoc.stats = userDoc.stats || {};
      userDoc.stats.total_xp = (userDoc.stats.total_xp || 0) + totalXP;
      updateUserLevel(userDoc);
      await userDoc.save();
    }
    
    const skill_breakdown = event.skills
      .filter(s => s.skill_id && s.xp_reward > 0)
      .map(s => ({
        skill_id: s.skill_id._id,
        skill_name: s.skill_id.name || s.skill_id.code,
        xp_amount: s.xp_reward,
        level_before: 1,
        level_after: 1,
      }));
    
    const xpLedger = new XPLedger({
      user_id: user._id,
      campus_id: event.campus_id,
      source_type: 'EVENT_COMPLETION',
      source_id: event._id,
      source_name: event.title,
      base_xp: totalXP,
      final_xp: totalXP,
      skill_breakdown,
      organizer_id: event.organizer_id,
      description: `Check-in event ${event.title} qua QR code`,
      effective_date: new Date(),
    });
    await xpLedger.save();
    
    registration.xp_awarded = true;
  }
  
  await registration.save();
  
  // Update event stats
  await updateEventStats(event, "attended", 1);
  
  // Update quest progress
  await updateQuestProgressSafely(user._id, "EVENT_ATTEND", 1);
  
  return {
    registration,
    event: {
      _id: event._id,
      title: event.title,
      start_at: event.start_at,
      end_at: event.end_at,
    },
  };
}

/**
 * Lấy thông tin QR code của event
 */
async function getEventQRCode(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  // Check permission
  if (!checkEventManagerPermission(user, event)) {
    throwError("Bạn không có quyền xem QR code của event này", 403);
  }
  
  const qrCheckIn = await EventCheckIn.findOne({ event_id: eventId });
  
  if (!qrCheckIn) {
    throwError("Event chưa có QR code check-in", 404);
  }
  
  return {
    event_id: eventId,
    qr_code_token: qrCheckIn.qr_code_token,
    expires_at: qrCheckIn.expires_at,
    is_active: qrCheckIn.is_active,
    is_valid: qrCheckIn.isValid(),
    max_scans: qrCheckIn.max_scans,
    scan_count: qrCheckIn.scan_count,
    check_ins_count: qrCheckIn.check_ins.length,
  };
}

/**
 * Vô hiệu hóa QR code
 */
async function deactivateEventQRCode(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  // Check permission
  if (!checkEventManagerPermission(user, event)) {
    throwError("Bạn không có quyền vô hiệu hóa QR code của event này", 403);
  }
  
  const qrCheckIn = await EventCheckIn.findOne({ event_id: eventId });
  
  if (!qrCheckIn) {
    throwError("Event chưa có QR code check-in", 404);
  }
  
  qrCheckIn.is_active = false;
  await qrCheckIn.save();
  
  // Update event
  event.qr_checkin_enabled = false;
  await event.save();
  
  return {
    message: "QR code đã được vô hiệu hóa",
    event_id: eventId,
  };
}

/**
 * Xóa QR code check-in của event (hard delete)
 */
async function deleteEventQRCode(user, eventId) {
  const event = await loadEventOrThrow(eventId);
  
  // Check permission
  if (!checkEventManagerPermission(user, event)) {
    throwError("Bạn không có quyền xóa QR code của event này", 403);
  }
  
  const qrCheckIn = await EventCheckIn.findOne({ event_id: eventId });
  
  if (!qrCheckIn) {
    throwError("Event chưa có QR code check-in", 404);
  }
  
  // Delete QR check-in record
  await EventCheckIn.deleteOne({ event_id: eventId });
  
  // Update event
  event.qr_checkin_enabled = false;
  await event.save();
  
  return {
    message: "QR code đã được xóa thành công",
    event_id: eventId,
  };
}


// ===== EXPORTS =====
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
  checkinByQRCode,
  getEventQRCode,
  deactivateEventQRCode,
  deleteEventQRCode,
  
  // Helper functions (for testing)
  _clearEventsCache: clearEventsCache,
};