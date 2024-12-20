const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products', // Folder in Cloudinary for storing images
    allowed_formats: ['jpg', 'png', 'jpeg'], // Allowed image formats
  },
});

// Export storage and upload middleware
const upload = require('multer')({ storage });

module.exports = { cloudinary, upload };
