const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const authRepo = require('./auth.repo');
const User = require('../../model/user.model');
const Tenant = require('../../model/tenant.model');
const InviteCode = require('../../model/inviteCode.model');
const { sendEmail } = require('../../utils/emailService');
const { generateOTP } = require('../../utils/helpers');
const dailyService = require('../daily/daily.service');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  async register(userData) {
    const { email, password, profile, invite_code } = userData;

    // Check if user already exists
    const existingUser = await authRepo.findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email đã được sử dụng');
    }

    // Validate invite code if provided
    let tenantId = null;
    if (invite_code) {
      const invite = await authRepo.validateInviteCode(invite_code);
      tenantId = invite.tenant_id;
    } else {
      // Auto-detect tenant by email domain
      // const domain = email.split('@')[1];
      // const tenant = await authRepo.findTenantByDomain(domain);
      // if (tenant) {
      //   tenantId = tenant._id;
      // }

       tenantId = "692269229818b8eac3c077af";
    }

    // Tạo OTP và lưu vào DB (chưa tạo user)
    const otpCode = generateOTP();
    await authRepo.createOTPTemp({
      email,
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      createdAt: new Date(),
      password,
      profile,
      invite_code,
      tenantId
    });

    // Gửi email OTP
    await sendEmail({
      to: email,
      subject: 'Xác thực email - SkillUp Platform',
      template: 'email-verification',
      data: {
        name: profile.full_name,
        code: otpCode
      }
    });

    return true;
  }

  async login(email, password) {
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    if (!user.is_active) {
      throw new Error('Tài khoản đã bị vô hiệu hóa');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Update last login
    await authRepo.updateUser(user._id, { last_login_at: new Date() });

    const token = this.generateToken(user);

    // Trigger DAILY_LOGIN quest progress
    try {
      await dailyService.increaseProgress(user._id, 'DAILY_LOGIN', 1);
    } catch (err) {
      console.warn('Error updating DAILY_LOGIN quest:', err);
    }

    return { user: this.sanitizeUser(user), token };
  }

  async googleAuth(idToken, invite_code) {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await authRepo.findUserByEmail(email);

    if (!user) {
      // Auto-register with Google
      let tenantId = null;

      // Handle invite code or domain detection
      if (invite_code) {
        const invite = await authRepo.validateInviteCode(invite_code);
        tenantId = invite.tenant_id;
      } else {
        const domain = email.split('@')[1];
        const tenant = await authRepo.findTenantByDomain(domain);
        if (tenant) {
          tenantId = tenant._id;
        }
      }

      // Create new user
      user = await authRepo.createUser({
        email,
        google_id: payload.sub,
        tenant_id: tenantId,
        profile: {
          full_name: name,
          avatar_url: picture,
          student_id: null,
          major: null
        },
        affiliations: tenantId ? [{
          tenant_id: tenantId,
          role: 'STUDENT',
          verified: false
        }] : [],
        email_verified: true, // Google emails are verified
        is_active: true
      });
    } else {
      // Update last login for existing user
      await authRepo.updateUser(user._id, { 
        last_login_at: new Date(),
        google_id: payload.sub,
        is_active: true
      });
    }

    const token = this.generateToken(user);

    // Trigger DAILY_LOGIN quest progress for Google login
    try {
      await dailyService.increaseProgress(user._id, 'DAILY_LOGIN', 1);
    } catch (err) {
      console.warn('Error updating DAILY_LOGIN quest (Google):', err);
    }

    return { user: this.sanitizeUser(user), token };
  }

  async verifyEmail({ email, code, password, profile, invite_code }) {
    // Tìm OTP tạm
    const otpTemp = await authRepo.findOTPTemp(email, code);
    if (!otpTemp) {
      throw new Error('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }
    if (otpTemp.attempts >= 5) {
      throw new Error('Bạn đã nhập sai quá số lần cho phép, vui lòng gửi lại mã mới.');
    }
    // Nếu đúng OTP, tạo user
    const hashedPassword = await bcrypt.hash(otpTemp.password, 12);
    const user = await authRepo.createUser({
      email,
      password_hash: hashedPassword,
      tenant_id: otpTemp.tenantId,
      profile: otpTemp.profile,
      affiliations: otpTemp.tenantId ? [{
        tenant_id: otpTemp.tenantId,
        role: 'STUDENT',
        department: otpTemp.profile.major,
        student_id: otpTemp.profile.student_id,
        verified: false
      }] : [],
      email_verified: true,
      is_active: true
    });
    // Xóa OTP tạm
    await authRepo.deleteOTPTemp(email, code);
    // Tạo token
    const token = this.generateToken(user);
    return { user: this.sanitizeUser(user), token };
  }

  async resendVerification(email) {
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      throw new Error('Email không tồn tại');
    }

    if (user.email_verified) {
      throw new Error('Email đã được xác thực');
    }

    // Generate new OTP
    const otp = await authRepo.createOTP(user._id, email, 'email_verification');

    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Xác thực email - SkillUp Platform',
      template: 'email-verification',
      data: {
        name: user.profile.full_name,
        code: otp.code
      }
    });

    return true;
  }

  async forgotPassword(email) {
    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    // Generate password reset OTP
    const otp = await authRepo.createOTP(user._id, email, 'password_reset');

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Reset mật khẩu - SkillUp Platform',
      template: 'password-reset',
      data: {
        name: user.profile.full_name,
        code: otp.code
      }
    });

    return true;
  }

  async resetPassword(email, code, newPassword) {
    const otp = await authRepo.findValidOTP(email, code, 'password_reset');
    if (!otp) {
      throw new Error('Mã reset không hợp lệ hoặc đã hết hạn');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await authRepo.updateUser(otp.user_id, { password_hash: hashedPassword });

    // Mark OTP as used
    await authRepo.markOTPAsUsed(otp._id);

    return true;
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepo.findUserById(userId);
    if (!user) {
      throw new Error('User không tồn tại');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await authRepo.updateUser(userId, { password_hash: hashedPassword });

    return true;
  }

  async getUserProfile(userId) {
    const user = await authRepo.findUserById(userId);
    if (!user) {
      throw new Error('User không tồn tại');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId, updateData) {
    const allowedFields = ['profile.full_name', 'profile.major', 'profile.bio', 'profile.phone', 'profile.links'];
    
    const updateObject = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        const value = updateData[key];
        if (typeof value === 'object') {
          Object.assign(updateObject, this.flattenObject(value, key));
        } else {
          updateObject[key] = value;
        }
      }
    });

    const user = await authRepo.updateUser(userId, updateObject);
    return this.sanitizeUser(user);
  }

  // Helper methods
  generateToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        tenantId: user.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    
    // Remove sensitive fields
    delete userObj.password_hash;
    delete userObj.__v;
    
    // Add permission flags for frontend
    userObj.permissions = {
      canAccessAdmin: this.canAccessAdmin(userObj),
      isOrganizerManager: this.isOrganizerManager(userObj),
      isCampusAdmin: userObj.roles?.includes('CAMPUS_ADMIN') || false,
      isTenantAdmin: userObj.roles?.includes('TENANT_ADMIN') || false,
      isSuperAdmin: userObj.roles?.includes('SUPER_ADMIN') || false,
    };
    
    return userObj;
  }
  
  canAccessAdmin(user) {
    // Check if user can access admin dashboard
    if (user.roles?.includes('SUPER_ADMIN')) return true;
    if (user.roles?.includes('TENANT_ADMIN')) return true;
    if (user.roles?.includes('CAMPUS_ADMIN')) return true;
    
    // Check if user is manager of any organizer (CLB)
    const isOrganizerManager = user.affiliations?.some(a => 
      ['EVENT_MANAGER', 'CLUB_ADMIN'].includes(a.role) && a.organizer_id
    );
    
    return isOrganizerManager;
  }
  
  isOrganizerManager(user) {
    return user.affiliations?.some(a => 
      ['EVENT_MANAGER', 'CLUB_ADMIN'].includes(a.role) && a.organizer_id
    );
  }

  flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? prefix + '.' : '';
      acc[pre + key] = obj[key];
      return acc;
    }, {});
  }
}

module.exports = new AuthService();
