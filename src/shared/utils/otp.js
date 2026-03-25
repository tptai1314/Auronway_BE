const { prisma } = require('../db');
const { sendOTP } = require('../email/mailer');

/**
 * Generate random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create and send OTP
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} type - 'email_verification' or 'password_reset'
 */
async function createAndSendOTP(userId, email, type = 'email_verification') {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Xóa các OTP cũ chưa dùng của user này (cùng type)
  await prisma.otp.deleteMany({
    where: { user_id: userId, type, used: false }
  });

  // Tạo OTP mới
  await prisma.otp.create({
    data: {
      user_id: userId,
      email,
      code,
      type,
      expires_at: expiresAt
    }
  });

  // Gửi email
  await sendOTP(email, code, type);

  return { msg: 'OTP sent to your email' };
}

/**
 * Verify OTP
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @param {string} type - 'email_verification' or 'password_reset'
 */
async function verifyOTP(email, code, type) {
  const otp = await prisma.otp.findFirst({
    where: {
      email,
      code,
      type,
      used: false,
      expires_at: { gte: new Date() }
    }
  });

  if (!otp) {
    throw new Error('Invalid or expired OTP');
  }

  // Đánh dấu OTP đã dùng
  await prisma.otp.update({
    where: { id: otp.id },
    data: { used: true }
  });

  return otp;
}

/**
 * Clean up expired OTPs (có thể chạy định kỳ bằng cron job)
 */
async function cleanupExpiredOTPs() {
  const deleted = await prisma.otp.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { used: true, created_at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }
  });
  return deleted;
}

module.exports = {
  generateOTP,
  createAndSendOTP,
  verifyOTP,
  cleanupExpiredOTPs
};
