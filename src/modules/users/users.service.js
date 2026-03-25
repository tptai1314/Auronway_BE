

const User = require('../../model/user.model');
const Avatar = require('../../model/avatar.model');
const cloudinaryService = require('../../utils/cloudinary.service');

/**
 * Lấy thông tin profile của user
 * @param {string} userId - ID của user
 * @returns {Promise<Object|null>} User profile và thông tin cơ bản
 */
async function getMyProfile(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const user = await User.findById(userId)
    .select('_id email profile stats')
    .lean();

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user._id,
    email: user.email,
    profile: user.profile || {},
    stats: user.stats || {}
  };
}

/**
 * Cập nhật profile của user
 * @param {string} userId - ID của user
 * @param {Object} payload - Dữ liệu profile cần cập nhật
 * @returns {Promise<Object>} User profile đã được cập nhật
 */
async function upsertMyProfile(userId, payload) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Validate và clean data - chỉ update các field được phép
  const updateFields = {};
  
  if (payload.full_name !== undefined) {
    updateFields['profile.full_name'] = payload.full_name;
  }
  if (payload.avatar_url !== undefined) {
    updateFields['profile.avatar_url'] = payload.avatar_url;
  }
  if (payload.date_of_birth !== undefined) {
    updateFields['profile.date_of_birth'] = payload.date_of_birth ? new Date(payload.date_of_birth) : null;
  }
  if (payload.major !== undefined) {
    updateFields['profile.major'] = payload.major;
  }
  if (payload.bio !== undefined) {
    updateFields['profile.bio'] = payload.bio;
  }
  if (payload.student_id !== undefined) {
    updateFields['profile.student_id'] = payload.student_id;
  }
  if (payload.phone !== undefined) {
    updateFields['profile.phone'] = payload.phone;
  }
  
  // Update social links nếu có
  if (payload.links) {
    if (payload.links.github !== undefined) {
      updateFields['profile.links.github'] = payload.links.github;
    }
    if (payload.links.linkedin !== undefined) {
      updateFields['profile.links.linkedin'] = payload.links.linkedin;
    }
    if (payload.links.portfolio !== undefined) {
      updateFields['profile.links.portfolio'] = payload.links.portfolio;
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  )
    .select('_id email profile stats')
    .lean();

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user._id,
    email: user.email,
    profile: user.profile || {},
    stats: user.stats || {}
  };
}

/**
 * Lấy danh sách avatar có sẵn
 * @param {string} userId - ID của user (để lấy tenant_id)
 * @returns {Promise<Array>} Danh sách avatar
 */
async function getAvailableAvatars(userId) {
  const user = await User.findById(userId).select('tenant_id').lean();
  if (!user) {
    throw new Error('User not found');
  }

  // Lấy avatar cho tenant của user hoặc avatar chung (tenant_id = null)
  const avatars = await Avatar.find({
    is_active: true,
    $or: [
      { tenant_id: user.tenant_id },
      { tenant_id: null }
    ]
  })
    .sort({ order: 1, created_at: 1 })
    .select('_id name image_url is_default')
    .lean();

  return avatars;
}

/**
 * Upload avatar mới cho user
 * @param {string} userId - ID của user
 * @param {Buffer} fileBuffer - Buffer của file ảnh
 * @returns {Promise<Object>} User profile đã cập nhật
 */
async function uploadUserAvatar(userId, fileBuffer) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!fileBuffer) {
    throw new Error('File is required');
  }

  // Tìm user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Lấy URL avatar cũ (nếu có)
  const oldAvatarUrl = user.profile?.avatar_url;

  // Upload ảnh mới lên Cloudinary
  const uploadResult = await cloudinaryService.uploadAvatar(
    fileBuffer,
    oldAvatarUrl,
    userId
  );

  // Cập nhật avatar_url trong profile
  if (!user.profile) {
    user.profile = {};
  }
  user.profile.avatar_url = uploadResult.url;

  await user.save();

  return {
    success: true,
    message: 'Upload avatar thành công',
    avatar_url: uploadResult.url
  };
}

module.exports = { getMyProfile, upsertMyProfile, getAvailableAvatars, uploadUserAvatar };
