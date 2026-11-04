// server/uploadMiddleware.js — Multer Upload Middlewares for Polaris/Astraonyx
const multer = require('multer');
const path = require('path');
const { UPLOADS_DIR } = require('./gdriveStorage');

const uploadDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype && file.mimetype.includes('image') ? '.jpg' : '.mp4');
    const safeName = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext.toLowerCase()}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage: uploadDiskStorage,
  limits: { fileSize: 55 * 1024 * 1024 }, // 55MB limit for photo/video uploads
});

const uploadVideo = multer({
  storage: uploadDiskStorage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150MB limit for HD video uploads
});

module.exports = {
  upload,
  uploadVideo,
  UPLOADS_DIR,
};
