const OTPTemp = require('../../model/otpTemp.model');
const User = require('../../model/user.model');
const Tenant = require('../../model/tenant.model');
const InviteCode = require('../../model/inviteCode.model');
const OTP = require('../../model/otp.model');

class AuthRepo {
    // OTP Temp operations (for registration)
    async createOTPTemp(data) {
      // Xóa OTP cũ cùng email
      await OTPTemp.deleteMany({ email: data.email });
      const otpTemp = new OTPTemp(data);
      return otpTemp.save();
    }

    async findOTPTemp(email, code) {
      return OTPTemp.findOne({ email, code, expiresAt: { $gt: new Date() } });
    }

    async deleteOTPTemp(email, code) {
      return OTPTemp.deleteOne({ email, code });
    }
  // User operations
  async findUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findUserById(userId) {
    return User.findById(userId);
  }

  async createUser(userData) {
    const user = new User(userData);
    return user.save();
  }

  async updateUser(userId, updateData) {
    return User.findByIdAndUpdate(
      userId, 
      { $set: updateData },
      { new: true }
    );
  }

  // Tenant operations
  async findTenantByDomain(domain) {
    return Tenant.findOne({ 
      domain: new RegExp(domain, 'i'),
      status: 'ACTIVE'
    });
  }

  async findTenantById(tenantId) {
    return Tenant.findById(tenantId);
  }

  // Invite code operations
  async validateInviteCode(code) {
    const invite = await InviteCode.findOne({ 
      code, 
      is_active: true,
      expires_at: { $gt: new Date() }
    });

    if (!invite) {
      throw new Error('Mã mời không hợp lệ hoặc đã hết hạn');
    }

    if (invite.used_count >= invite.max_uses) {
      throw new Error('Mã mời đã hết lượt sử dụng');
    }

    return invite;
  }

  async useInviteCode(code, userId, email) {
    return InviteCode.findOneAndUpdate(
      { code },
      { 
        $inc: { used_count: 1 },
        $push: { 
          used_by: { 
            user_id: userId, 
            used_at: new Date(),
            email
          } 
        },
        $set: { last_used_at: new Date() }
      },
      { new: true }
    );
  }

  // OTP operations
  async createOTP(userId, email, type) {
    // Invalidate any existing OTPs for this email and type
    await OTP.updateMany(
      { email, type, used: false },
      { $set: { used: true } }
    );

    const otp = new OTP({
      user_id: userId,
      email,
      code: this.generateOTPCode(),
      type,
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    return otp.save();
  }

  async findValidOTP(email, code, type) {
    return OTP.findOne({
      email,
      code,
      type,
      used: false,
      expires_at: { $gt: new Date() }
    });
  }

  async markOTPAsUsed(otpId) {
    return OTP.findByIdAndUpdate(otpId, { 
      used: true,
      used_at: new Date()
    });
  }

  // Helper methods
  generateOTPCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new AuthRepo();