const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload ảnh từ buffer lên Cloudinary
 * @param {Buffer} fileBuffer - Buffer của file ảnh
 * @param {string} folder - Thư mục trên Cloudinary (mặc định: 'avatars')
 * @param {string} publicId - Public ID cho ảnh (optional)
 * @returns {Promise<Object>} - Kết quả upload với secure_url
 */
async function uploadImage(fileBuffer, folder = 'avatars', publicId = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'limit' }, // Giới hạn kích thước
        { quality: 'auto' }, // Tự động tối ưu chất lượng
        { fetch_format: 'auto' } // Tự động chọn format tốt nhất
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      }
    );

    // Convert buffer thành stream và pipe vào upload stream
    const readableStream = Readable.from(fileBuffer);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Xóa ảnh trên Cloudinary
 * @param {string} publicId - Public ID của ảnh cần xóa
 * @returns {Promise<Object>} - Kết quả xóa
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}

/**
 * Upload avatar và xóa avatar cũ nếu có
 * @param {Buffer} fileBuffer - Buffer của file ảnh
 * @param {string} oldAvatarUrl - URL avatar cũ (để xóa)
 * @param {string} userId - ID của user (dùng làm public_id)
 * @returns {Promise<Object>} - Kết quả upload với URL mới
 */
async function uploadAvatar(fileBuffer, oldAvatarUrl = null, userId) {
  try {
    // Xóa avatar cũ nếu có
    if (oldAvatarUrl) {
      const publicId = extractPublicIdFromUrl(oldAvatarUrl);
      if (publicId) {
        await deleteImage(publicId).catch(err => {
          console.warn('Could not delete old avatar:', err.message);
        });
      }
    }

    // Upload avatar mới với public_id là user ID
    const result = await uploadImage(
      fileBuffer, 
      'avatars', 
      `user_${userId}`
    );

    return result;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}

/**
 * Trích xuất public_id từ Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID hoặc null
 */
function extractPublicIdFromUrl(url) {
  try {
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const matches = url.match(/\/([^\/]+)\.[a-z]+$/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  uploadAvatar,
  extractPublicIdFromUrl
};
