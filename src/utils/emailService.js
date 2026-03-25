const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async ({ to, subject, template, data }) => {
  const templates = {
    'email-verification': `
      <h2>Xác thực Email - SkillUp Platform</h2>
      <p>Xin chào ${data.name},</p>
      <p>Mã xác thực email của bạn là: <strong>${data.code}</strong></p>
      <p>Mã có hiệu lực trong 10 phút.</p>
      <br>
      <p>Trân trọng,<br>Đội ngũ SkillUp</p>
    `,
    'password-reset': `
      <h2>Reset Mật khẩu - SkillUp Platform</h2>
      <p>Xin chào ${data.name},</p>
      <p>Mã reset mật khẩu của bạn là: <strong>${data.code}</strong></p>
      <p>Mã có hiệu lực trong 10 phút.</p>
      <br>
      <p>Trân trọng,<br>Đội ngũ SkillUp</p>
    `
  };

  const html = templates[template] || '';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Không thể gửi email');
  }
};

module.exports = { sendEmail };