const S = require('./users.service');

// Simple async wrapper to avoid try/catch duplication
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /users/me/profile
 * Lấy thông tin profile của user hiện tại
 */
const getMeProfile = asyncHandler(async (req, res) => {
  const profile = await S.getMyProfile(req.user._id);
  
  res.status(200).json({
    success: true,
    message: profile ? "Lấy thông tin profile thành công" : "Chưa có thông tin profile",
    data: profile || null,
  });
});

/**
 * PUT /users/me/profile
 * Cập nhật thông tin profile của user hiện tại
 */
const updateMeProfile = asyncHandler(async (req, res) => {
  const profile = await S.upsertMyProfile(req.user._id, req.body);
  
  res.status(200).json({
    success: true,
    message: "Cập nhật profile thành công",
    data: profile,
  });
});

/**
 * GET /users/me/avatars
 * Lấy danh sách avatar có sẵn để chọn
 */
const getAvailableAvatars = asyncHandler(async (req, res) => {
  const avatars = await S.getAvailableAvatars(req.user._id);
  
  res.status(200).json({
    success: true,
    message: "Lấy danh sách avatar thành công",
    data: avatars,
  });
});

/**
 * POST /users/me/avatar
 * Upload avatar mới cho user
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn file ảnh'
    });
  }

  const result = await S.uploadUserAvatar(req.user._id, req.file.buffer);
  
  res.status(200).json(result);
});

module.exports = { getMeProfile, updateMeProfile, getAvailableAvatars, uploadAvatar };
