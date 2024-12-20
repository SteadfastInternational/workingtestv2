const multer = require('multer');

// Multer setup for file uploads with memory storage
const storage = multer.memoryStorage(); // Temporarily store files in memory
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Set file size limit (10MB in this case)
  fileFilter: (req, file, cb) => {
    // Only allow image files (you can adjust this as needed)
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

module.exports = upload;
