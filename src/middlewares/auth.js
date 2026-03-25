const jwt = require("jsonwebtoken");
const User = require("../model/user.model");

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ.",
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Tài khoản đã bị vô hiệu hóa.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ.",
    });
  }
};

module.exports = { authenticate };
