const Organizer = require("../../model/organizer.model");
const bcrypt = require("bcryptjs");

class OrganizersService {
    async addMember(organizerId, user_id, role) {
      const Organizer = require('../../model/organizer.model');
      const organizer = await Organizer.findById(organizerId);
      if (!organizer) throw new Error('Organizer not found');
      // Kiểm tra trùng user_id và role
      if (organizer.members.some(m => m.user_id.toString() === user_id && m.role === role)) {
        throw new Error('Thành viên đã tồn tại với vai trò này');
      }
      organizer.members.push({ user_id, role, joined_at: new Date() });
      await organizer.save();
      return organizer;
    }
  async getMyOrganizers(userId) {
    const Organizer = require("../../model/organizer.model");
    try {
      // Là manager hoặc thành viên
      return await Organizer.find({
        is_active: true,
        $or: [{ manager_id: userId }, { "members.user_id": userId }],
      });
    } catch (error) {
      throw new Error("Failed to fetch organizers: " + error.message);
    }
  }
  async getOrganizerEvents(organizerId, query) {
    const Event = require("../../model/event.model");
    try {
      const filter = { organizer_id: organizerId };
      if (query.type) filter.type = query.type;
      if (query.status) filter.status = query.status;

      // Pagination
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const skip = (page - 1) * limit;

      return await Event.find(filter)
        .sort({ start_at: -1 })
        .skip(skip)
        .limit(limit);
    } catch (error) {
      throw new Error("Failed to fetch organizer events: " + error.message);
    }
  }
  async updateApprovers(organizerId, approvers) {
    return this.updateMembers(organizerId, approvers, "APPROVER");
  }

  async updateReviewers(organizerId, reviewers) {
    return this.updateMembers(organizerId, reviewers, "REVIEWER");
  }

  async updateMembers(organizerId, userIds, role) {
    const Organizer = require("../../model/organizer.model");
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer not found");
    let members = organizer.members || [];
    // Remove old members with the same role
    members = members.filter((m) => m.role !== role);
    // Add new members
    if (Array.isArray(userIds)) {
      members = members.concat(
        userIds.map((user_id) => ({
          user_id,
          role,
          joined_at: new Date(),
        }))
      );
    }
    organizer.members = members;
    await organizer.save();
    return organizer;
  }
  async disableOrganizer(organizerId) {
    const Organizer = require("../../model/organizer.model");
    const updated = await Organizer.findByIdAndUpdate(
      organizerId,
      { is_active: false },
      { new: true }
    );
    if (!updated) throw new Error("Organizer not found");
    return updated;
  }
  async updateOrganizer(organizerId, data) {
    const Organizer = require("../../model/organizer.model");
    const { name, manager_id, reviewers, approvers } = data;
    const update = {};
    if (name) update.name = name;
    if (manager_id) update.manager_id = manager_id;

    // Update reviewer/approver list
    if (Array.isArray(reviewers)) {
      await this.updateMembers(organizerId, reviewers, "REVIEWER");
    }
    if (Array.isArray(approvers)) {
      await this.updateMembers(organizerId, approvers, "APPROVER");
    }

    const updated = await Organizer.findByIdAndUpdate(organizerId, update, {
      new: true,
    });
    if (!updated) throw new Error("Organizer not found");
    return updated;
  }

  async createOrganizer(user, data) {
    // ADMIN, TENANT_ADMIN, hoặc CAMPUS_ADMIN mới tạo được
    const hasPermission = user.affiliations.some((a) => 
      ["ADMIN", "TENANT_ADMIN", "CAMPUS_ADMIN"].includes(a.role)
    );
    
    if (!hasPermission) {
      throw new Error("Bạn không có quyền tạo organizer");
    }

    // Validate input data
    const { name, tenant_id, type, description, contact_email, logo_url, campus_id } = data;
    if (!name || !tenant_id || !type) {
      throw new Error("Thông tin bắt buộc (name, tenant_id, type) không được bỏ trống");
    }

    if (!["CLUB", "DEPARTMENT", "OFFICE", "COMMITTEE"].includes(type)) {
      throw new Error("Loại organizer không hợp lệ");
    }

    // Nếu là CAMPUS_ADMIN, chỉ được tạo organizer cho campus của mình
    const campusAffiliation = user.affiliations.find(a => a.role === "CAMPUS_ADMIN");
    if (campusAffiliation && campus_id && campus_id !== campusAffiliation.campus_id?.toString()) {
      throw new Error("Bạn chỉ có thể tạo organizer cho campus của mình");
    }

    const organizer = new Organizer({
      name,
      tenant_id,
      type,
      description,
      contact_email,
      logo_url,
      campus_id: campus_id || campusAffiliation?.campus_id,
      created_by: user._id,
      is_active: true,
    });

    return organizer.save();
  }

  async getOrganizers(tenantId) {
    try {
      const query = tenantId
        ? { tenant_id: tenantId, is_active: true }
        : { is_active: true };
      return await Organizer.find(query);
    } catch (error) {
      throw new Error("Failed to fetch organizers: " + error.message);
    }
  }

  async getOrganizerDetail(organizerId) {
    const Organizer = require("../../model/organizer.model");
    const User = require("../../model/user.model");
    const Event = require("../../model/event.model");

    try {
      // Fetch organizer with populated manager and members
      const organizer = await Organizer.findById(organizerId)
        .populate({
          path: "manager_id",
          select: "name email avatar",
          model: "User",
        })
        .populate({
          path: "members.user_id",
          select: "name email avatar",
          model: "User",
        })
        .lean();

      if (!organizer) throw new Error("Organizer not found");

      // Extract reviewers and approvers
      const reviewers = organizer.members?.filter((m) => m.role === "REVIEWER") || [];
      const approvers = organizer.members?.filter((m) => m.role === "APPROVER") || [];

      // Fetch recent events
      const [totalEvents, recentEvents] = await Promise.all([
        Event.countDocuments({ organizer_id: organizerId }),
        Event.find({ organizer_id: organizerId })
          .sort({ start_at: -1 })
          .limit(5)
          .select("title start_at end_at status type")
          .lean(),
      ]);

      return {
        _id: organizer._id,
        name: organizer.name,
        type: organizer.type,
        description: organizer.description,
        contact_email: organizer.contact_email,
        manager: organizer.manager_id,
        reviewers: reviewers.map((m) => m.user_id),
        approvers: approvers.map((m) => m.user_id),
        stats: {
          total_events: totalEvents,
          ...organizer.stats,
        },
        recent_events: recentEvents,
      };
    } catch (error) {
      if (error.message === "Organizer not found") {
        throw new Error("Organizer not found");
      } else {
        throw new Error("Failed to fetch organizer details: " + error.message);
      }
    }
  }
  
  /**
   * Tạo tài khoản đăng nhập cho CLB (chỉ CAMPUS_ADMIN mới được tạo)
   */
  async createOrganizerAccount(adminUser, organizerId, accountData) {
    // Kiểm tra quyền: chỉ CAMPUS_ADMIN hoặc SUPER_ADMIN
    const isCampusAdmin = adminUser.roles?.includes("CAMPUS_ADMIN") || 
                          adminUser.roles?.includes("SUPER_ADMIN") ||
                          adminUser.roles?.includes("TENANT_ADMIN");
    
    if (!isCampusAdmin) {
      throw new Error("Chỉ Campus Admin mới có quyền tạo tài khoản cho CLB");
    }
    
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    // Chỉ cho phép tạo account cho type CLUB
    if (organizer.type !== "CLUB") {
      throw new Error("Chỉ có thể tạo tài khoản đăng nhập cho CLB (CLUB)");
    }
    
    // Validate input
    const { email, password } = accountData;
    if (!email || !password) {
      throw new Error("Email và password là bắt buộc");
    }
    
    if (password.length < 6) {
      throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
    }
    
    // Kiểm tra email đã tồn tại chưa
    const existingOrg = await Organizer.findOne({ email });
    if (existingOrg) {
      throw new Error("Email này đã được sử dụng bởi CLB khác");
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Update organizer với credentials
    organizer.email = email;
    organizer.password_hash = password_hash;
    await organizer.save();
    
    return {
      organizer_id: organizer._id,
      name: organizer.name,
      email: organizer.email,
      message: "Tạo tài khoản đăng nhập cho CLB thành công",
    };
  }
  
  /**
   * Đăng nhập cho CLB
   */
  async loginOrganizer(email, password) {
    // Tìm organizer với email
    const organizer = await Organizer.findOne({ email, is_active: true });
    
    if (!organizer) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }
    
    // Kiểm tra password
    if (!organizer.password_hash) {
      throw new Error("CLB này chưa có tài khoản đăng nhập");
    }
    
    const isValidPassword = await bcrypt.compare(password, organizer.password_hash);
    if (!isValidPassword) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }
    
    // Generate JWT token (sẽ cần implement JWT helper)
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    
    const token = jwt.sign(
      {
        organizer_id: organizer._id,
        type: "organizer",
        tenant_id: organizer.tenant_id,
        campus_id: organizer.campus_id,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    return {
      token,
      organizer: {
        _id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        type: organizer.type,
        tenant_id: organizer.tenant_id,
        campus_id: organizer.campus_id,
        logo_url: organizer.logo_url,
      },
    };
  }
  
  /**
   * Đổi mật khẩu CLB
   */
  async changeOrganizerPassword(organizerId, oldPassword, newPassword) {
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    if (!organizer.password_hash) {
      throw new Error("CLB này chưa có tài khoản đăng nhập");
    }
    
    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, organizer.password_hash);
    if (!isValidPassword) {
      throw new Error("Mật khẩu cũ không đúng");
    }
    
    // Validate new password
    if (newPassword.length < 6) {
      throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    organizer.password_hash = await bcrypt.hash(newPassword, salt);
    await organizer.save();
    
    return { message: "Đổi mật khẩu thành công" };
  }
  
  /**
   * Lấy danh sách thành viên của CLB
   */
  async getOrganizerMembers(organizerId) {
    const organizer = await Organizer.findById(organizerId)
      .populate({
        path: 'members.user_id',
        select: 'email profile.full_name profile.avatar_url profile.student_id'
      })
      .populate({
        path: 'manager_id',
        select: 'email profile.full_name profile.avatar_url'
      })
      .lean();
    
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    return {
      organizer_id: organizer._id,
      name: organizer.name,
      is_private: organizer.is_private,
      manager: organizer.manager_id,
      members: organizer.members.map(m => ({
        user: m.user_id,
        role: m.role,
        joined_at: m.joined_at
      })),
      total_members: organizer.members?.length || 0
    };
  }
  
  /**
   * Thêm thành viên vào CLB
   */
  async addOrganizerMember(adminUser, organizerId, userId, role = "MEMBER") {
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    // Check quyền: phải là manager hoặc campus admin
    const isManager = organizer.manager_id && 
                     organizer.manager_id.toString() === adminUser._id.toString();
    const isCampusAdmin = adminUser.roles?.includes("CAMPUS_ADMIN") || 
                          adminUser.roles?.includes("SUPER_ADMIN") ||
                          adminUser.roles?.includes("TENANT_ADMIN");
    
    if (!isManager && !isCampusAdmin) {
      throw new Error("Bạn không có quyền thêm thành viên vào CLB này");
    }
    
    // Kiểm tra user có tồn tại không
    const User = require("../../model/user.model");
    const user = await User.findById(userId);
    if (!user) throw new Error("User không tồn tại");
    
    // Kiểm tra user đã là thành viên chưa
    const isMember = organizer.members?.some(
      m => m.user_id.toString() === userId.toString()
    );
    
    if (isMember) {
      throw new Error("User đã là thành viên của CLB này");
    }
    
    // Thêm thành viên
    organizer.members = organizer.members || [];
    organizer.members.push({
      user_id: userId,
      role: role,
      joined_at: new Date()
    });
    
    await organizer.save();
    
    return {
      message: "Thêm thành viên thành công",
      member: {
        user_id: userId,
        role: role,
        joined_at: new Date()
      }
    };
  }
  
  /**
   * Xóa thành viên khỏi CLB
   */
  async removeOrganizerMember(adminUser, organizerId, userId) {
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    // Check quyền: phải là manager hoặc campus admin
    const isManager = organizer.manager_id && 
                     organizer.manager_id.toString() === adminUser._id.toString();
    const isCampusAdmin = adminUser.roles?.includes("CAMPUS_ADMIN") || 
                          adminUser.roles?.includes("SUPER_ADMIN") ||
                          adminUser.roles?.includes("TENANT_ADMIN");
    
    if (!isManager && !isCampusAdmin) {
      throw new Error("Bạn không có quyền xóa thành viên khỏi CLB này");
    }
    
    // Kiểm tra user có phải thành viên không
    const memberIndex = organizer.members?.findIndex(
      m => m.user_id.toString() === userId.toString()
    );
    
    if (memberIndex === -1 || memberIndex === undefined) {
      throw new Error("User không phải thành viên của CLB này");
    }
    
    // Xóa thành viên
    organizer.members.splice(memberIndex, 1);
    await organizer.save();
    
    return {
      message: "Xóa thành viên thành công"
    };
  }
  
  /**
   * Cập nhật chế độ riêng tư của CLB
   */
  async updateOrganizerPrivacy(adminUser, organizerId, isPrivate) {
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) throw new Error("Organizer không tồn tại");
    
    // Check quyền: phải là manager hoặc campus admin
    const isManager = organizer.manager_id && 
                     organizer.manager_id.toString() === adminUser._id.toString();
    const isCampusAdmin = adminUser.roles?.includes("CAMPUS_ADMIN") || 
                          adminUser.roles?.includes("SUPER_ADMIN") ||
                          adminUser.roles?.includes("TENANT_ADMIN");
    
    if (!isManager && !isCampusAdmin) {
      throw new Error("Bạn không có quyền thay đổi cài đặt CLB này");
    }
    
    organizer.is_private = isPrivate;
    await organizer.save();
    
    return {
      message: `CLB đã ${isPrivate ? 'bật' : 'tắt'} chế độ riêng tư`,
      is_private: organizer.is_private
    };
  }
}

module.exports = new OrganizersService();
