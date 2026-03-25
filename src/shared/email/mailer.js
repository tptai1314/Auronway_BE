const nodemailer = require('nodemailer');

// Tạo transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send email
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML
 */
async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Auronway'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send OTP email
 * @param {string} email - Email người nhận
 * @param {string} otp - Mã OTP 6 số
 * @param {string} type - Loại OTP: 'email_verification' hoặc 'password_reset'
 */
async function sendOTP(email, otp, type = 'email_verification') {
  const subject = type === 'email_verification' 
    ? 'Xác minh email của bạn' 
    : 'Đặt lại mật khẩu';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; text-align: center; padding: 20px; background-color: #f0f0f0; border-radius: 5px; }
        .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>${type === 'email_verification' ? 'Xác minh email' : 'Đặt lại mật khẩu'}</h2>
        <p>Xin chào,</p>
        <p>${type === 'email_verification' 
          ? 'Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP dưới đây để xác minh email của bạn:' 
          : 'Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP dưới đây:'
        }</p>
        <div class="otp-code">${otp}</div>
        <p><strong>Lưu ý:</strong> Mã OTP này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Auronway. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
}

module.exports = { sendEmail, sendOTP };
