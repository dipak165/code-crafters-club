const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');

// Local disk storage for member uploads (profile photos, CVs). Same
// note as certificates: swap this for a Cloudinary/S3 adapter for
// production (spec section 40) — the multer config below is the only
// place that needs to change.
const STORAGE_DIR = path.join(__dirname, '..', 'storage', 'members');
fs.mkdirSync(STORAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_CV_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB

function fileFilter(req, file, cb) {
  if (file.fieldname === 'profileImage') {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Profile image must be JPEG, PNG, or WebP.', 400));
    }
  } else if (file.fieldname === 'cv') {
    if (!ALLOWED_CV_TYPES.includes(file.mimetype)) {
      return cb(new AppError('CV must be a PDF file.', 400));
    }
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_CV_SIZE }, // multer applies one limit; per-field size is re-checked below
});

// multer's per-file limits option is awkward for mixed field types, so
// re-validate size per field after upload rather than trusting the
// single global limit above.
function enforcePerFieldSize(req, res, next) {
  const files = req.files || {};
  if (files.profileImage?.[0] && files.profileImage[0].size > MAX_IMAGE_SIZE) {
    return next(new AppError('Profile image must be under 2MB.', 400));
  }
  if (files.cv?.[0] && files.cv[0].size > MAX_CV_SIZE) {
    return next(new AppError('CV must be under 5MB.', 400));
  }
  next();
}

const memberUploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
]);

// Separate storage namespace for recruitment resumes — kept apart
// from club member CVs even though both are PDFs, since applicants
// aren't necessarily registered members yet.
const RECRUITMENT_STORAGE_DIR = path.join(__dirname, '..', 'storage', 'recruitment');
fs.mkdirSync(RECRUITMENT_STORAGE_DIR, { recursive: true });

const recruitmentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECRUITMENT_STORAGE_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${unique}.pdf`);
  },
});

const resumeUpload = multer({
  storage: recruitmentStorage,
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_CV_TYPES.includes(file.mimetype)) {
      return cb(new AppError('Resume must be a PDF file.', 400));
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_CV_SIZE },
}).single('resume');

module.exports = {
  memberUploadFields,
  enforcePerFieldSize,
  resumeUpload,
  STORAGE_DIR,
  RECRUITMENT_STORAGE_DIR,
};
