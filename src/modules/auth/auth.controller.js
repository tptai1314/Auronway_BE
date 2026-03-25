const authService = require('./auth.service');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, full_name, student_id, major, invite_code } = req.body;
      await authService.register({
        email,
        password,
        profile: { full_name, student_id, major },
        invite_code
      });
      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực OTP.',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async googleAuth(req, res) {
    try {
      const { idToken, invite_code } = req.body;
      
      const result = await authService.googleAuth(idToken, invite_code);
      
      res.json({
        success: true,
        message: 'Đăng nhập Google thành công',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { email, code, password, full_name, student_id, major, invite_code } = req.body;
      const result = await authService.verifyEmail({
        email,
        code,
        password,
        profile: { full_name, student_id, major },
        invite_code
      });
      res.json({
        success: true,
        message: 'Xác thực email thành công, tài khoản đã được tạo!',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      await authService.resendVerification(email);
      
      res.json({
        success: true,
        message: 'Đã gửi lại mã xác thực'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      
      await authService.forgotPassword(email);
      
      res.json({
        success: true,
        message: 'Đã gửi hướng dẫn reset mật khẩu'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;
      
      await authService.resetPassword(email, code, newPassword);
      
      res.json({
        success: true,
        message: 'Reset mật khẩu thành công'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getMe(req, res) {
    try {
      const user = await authService.getUserProfile(req.user._id);
      
      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      const user = await authService.updateProfile(userId, updateData);
      
      res.json({
        success: true,
        message: 'Cập nhật profile thành công',
        data: { user }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async logout(req, res) {
    try {
      // In MongoDB, we can just respond success since we're using stateless JWT
      res.json({
        success: true,
        message: 'Đăng xuất thành công'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();