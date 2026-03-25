const Event = require("../model/event.model");

/**
 * ======================================================
 * requireRole()
 * ======================================================
 *  - Kiểm tra System Role (SUPER_ADMIN / TENANT_ADMIN / PUBLIC_USER)
 *  - Kiểm tra Affiliation Role (STUDENT / TEACHER / STAFF / EVENT_MANAGER / REVIEWER / APPROVER)
 *  - Kiểm tra scope (tenant / campus / organizer)
 *  - Hỗ trợ mode: OR / AND
 * ======================================================
 */
function requireRole({
  systemRoles = [],
  affiliationRoles = [],
  tenantScoped = true,
  campusScoped = false,
  organizerScoped = false,
  mode = "OR",
}) {
  return (req, res, next) => {
    const user = req.user;

    // 1. SUPER_ADMIN luôn pass
    if (user.roles?.includes("SUPER_ADMIN")) return next();

    let systemPass = false;
    let affiliationPass = false;

    // 2. SYSTEM ROLE CHECK
    if (systemRoles.length > 0) {
      systemPass = user.roles?.some((r) => systemRoles.includes(r));
    }

    // 3. AFFILIATION ROLE CHECK
    if (affiliationRoles.length > 0) {
      affiliationPass = user.affiliations?.some((a) => {
        if (!affiliationRoles.includes(a.role)) return false;

        if (tenantScoped && req.tenantId && a.tenant_id?.toString() !== req.tenantId?.toString())
          return false;

        if (campusScoped && req.campusId && a.campus_id?.toString() !== req.campusId?.toString())
          return false;

        if (organizerScoped && req.organizerId && a.organizer_id?.toString() !== req.organizerId?.toString())
          return false;

        return true;
      });
    }

    // 4. LOGIC OR
    if (mode === "OR") {
      if (systemPass || affiliationPass) return next();
    }

    // 5. LOGIC AND
    if (mode === "AND") {
      if (systemPass && affiliationPass) return next();
    }

    return res.status(403).json({ msg: "Forbidden" });
  };
}

/**
 * ======================================================
 * authorizeEventManagerOfEvent
 * ======================================================
 *  - Kiểm tra EVENT_MANAGER có quyền quản lý event cụ thể không
 *  - Check tenant scope, campus scope, organizer scope
 *  - Cho phép Event Manager cấp trường (global)
 * ======================================================
 */
async function authorizeEventManagerOfEvent(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: "Event không tồn tại" });

    const user = req.user;

    // Get event organizer_id as string (handle populated object)
    const eventOrganizerId = typeof event.organizer_id === 'object' && event.organizer_id?._id
      ? event.organizer_id._id.toString()
      : event.organizer_id?.toString();

    console.log("=== Authorization Debug ===");
    console.log("Event ID:", event._id);
    console.log("Event organizer_id (resolved):", eventOrganizerId);
    console.log("User roles:", user.roles);
    console.log("User affiliations:", JSON.stringify(user.affiliations, null, 2));

    // 1. SUPER_ADMIN always allowed
    if (user.roles?.includes("SUPER_ADMIN")) return next();

    // 2. TENANT_ADMIN có quyền quản lý mọi event trong tenant
    if (user.roles?.includes("TENANT_ADMIN")) {
      const isSameTenant = user.tenant_id?.toString() === event.tenant_id?.toString();
      if (isSameTenant) {
        console.log("✓ Authorized as TENANT_ADMIN");
        req.event = event;
        return next();
      }
    }

    // 3. CAMPUS_ADMIN có quyền duyệt/từ chối events của campus
    // CAMPUS_ADMIN là system role, lấy campus_id từ affiliations hoặc tenant_id từ user
    if (user.roles?.includes("CAMPUS_ADMIN")) {
      // Tìm campus mà user này quản lý (từ bất kỳ affiliation nào có campus_id)
      const userCampusAffiliation = user.affiliations?.find(
        (a) => a.campus_id && 
               a.tenant_id?.toString() === event.tenant_id?.toString() &&
               a.campus_id?.toString() === event.campus_id?.toString()
      );
      
      // Hoặc check nếu user có tenant_id match với event (CAMPUS_ADMIN cấp tenant)
      const isSameTenant = user.tenant_id?.toString() === event.tenant_id?.toString();
      
      if (userCampusAffiliation || isSameTenant) {
        console.log("✓ Authorized as CAMPUS_ADMIN");
        req.event = event;
        return next();
      }
    }

    // 4. EVENT_MANAGER / CLUB_ADMIN check
    const ok = user.affiliations?.some((a) => {
      console.log("Checking affiliation:", a.role, "organizer_id:", a.organizer_id);
      
      if (!["EVENT_MANAGER", "CLUB_ADMIN"].includes(a.role)) return false;

      // CLUB_ADMIN hoặc EVENT_MANAGER với organizer_id: chỉ cần check organizer_id match
      if (a.organizer_id) {
        const match = a.organizer_id?.toString() === eventOrganizerId;
        console.log(`${a.role} check:`, a.organizer_id?.toString(), "vs", eventOrganizerId, "=", match);
        return match;
      }

      // EVENT_MANAGER: Event Manager toàn tenant (không có organizer_id)
      if (!a.campus_id && !a.organizer_id) {
        const match = a.tenant_id?.toString() === event.tenant_id?.toString();
        console.log("EVENT_MANAGER (tenant-wide) check:", match);
        return match;
      }

      // EVENT_MANAGER: Normal scoped (có campus nhưng không có organizer)
      const match = (
        a.tenant_id?.toString() === event.tenant_id?.toString() &&
        (!a.campus_id || a.campus_id?.toString() === event.campus_id?.toString())
      );
      console.log("EVENT_MANAGER (scoped) check:", match);
      return match;
    });

    if (!ok) {
      console.log("✗ Authorization failed");
      return res.status(403).json({ msg: "Bạn không có quyền quản lý event này" });
    }

    console.log("✓ Authorized via affiliation");

    // Chặn sửa event đã completed (cho phép sửa CANCELLED để có thể từ chối draft)
    if (event.status === "COMPLETED") {
      return res.status(400).json({ msg: "Không thể chỉnh sửa event đã hoàn tất" });
    }

    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * ======================================================
 * requireAdminOrOrganizerManager
 * ======================================================
 *  - Cho phép: SUPER_ADMIN, TENANT_ADMIN, CAMPUS_ADMIN
 *  - HOẶC: User là manager của organizer (EVENT_MANAGER/CLUB_ADMIN)
 * ======================================================
 */
function requireAdminOrOrganizerManager(req, res, next) {
  const user = req.user;

  // 1. SUPER_ADMIN luôn pass
  if (user.roles?.includes("SUPER_ADMIN")) return next();

  // 2. TENANT_ADMIN hoặc CAMPUS_ADMIN
  const isSystemAdmin = user.roles?.some(r => 
    ["TENANT_ADMIN", "CAMPUS_ADMIN"].includes(r)
  );
  if (isSystemAdmin) return next();

  // 3. Là manager của ít nhất 1 organizer (CLB)
  const isOrganizerManager = user.affiliations?.some(a => 
    ["EVENT_MANAGER", "CLUB_ADMIN"].includes(a.role) && a.organizer_id
  );
  
  if (isOrganizerManager) return next();

  return res.status(403).json({ 
    success: false,
    message: "Bạn không có quyền truy cập trang admin. Chỉ Admin hoặc Manager CLB mới có quyền."
  });
}

module.exports = {
  requireRole,
  authorizeEventManagerOfEvent,
  requireAdminOrOrganizerManager,
};
