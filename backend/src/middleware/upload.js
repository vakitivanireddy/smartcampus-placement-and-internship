const path = require('path');
const multer = require('multer');
const env = require('../config/env');

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const allowedMime = ['application/pdf', 'application/x-pdf'];
  if (allowedMime.includes(file.mimetype) && extension === '.pdf') {
    return cb(null, true);
  }
  const error = new Error('Only PDF resumes are accepted.');
  error.status = 400;
  return cb(error);
}

const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.maxResumeMb * 1024 * 1024,
    files: 1,
    fields: 4,
  },
}).single('resume');

function handleUpload(req, res, next) {
  uploadResume(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      error.status = 400;
      error.message = `Resume must be smaller than ${env.maxResumeMb} MB.`;
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      error.status = 400;
      error.message = 'Upload a single PDF file using the field name "resume".';
    }
    return next(error);
  });
}

module.exports = { handleUpload };
