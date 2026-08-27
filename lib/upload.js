const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_ROOT);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error(`"${ext || 'unknown'}" files aren't allowed. Use PDF, DOC, DOCX, JPG, PNG, or WEBP.`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB per file
    files: 8,
  },
});

module.exports = { upload, UPLOAD_ROOT, ALLOWED_EXT };
