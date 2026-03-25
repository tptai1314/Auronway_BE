const multer = require('multer');

// Cấu hình Multer để lưu file vào memory (buffer)
const storage = multer.memoryStorage();

// File filter - chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
  // Chấp nhận các định dạng ảnh
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh! (jpg, jpeg, png, gif, webp)'), false);
  }
};

// Cấu hình upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

// Middleware để upload single file với field name 'avatar'
const uploadAvatar = upload.single('avatar');

// Middleware xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn! Kích thước tối đa là 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

module.exports = {
  upload,
  uploadAvatar,
  handleUploadError
};
