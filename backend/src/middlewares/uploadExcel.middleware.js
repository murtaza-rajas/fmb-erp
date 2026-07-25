// Multer middleware for the Vendor/Item "import from Excel" endpoints.
// Memory storage only — the file is parsed in-process by exceljs and never
// written to disk. This is unrelated to the S3 presigned-upload flow in
// upload.routes.js, which is for user-facing document attachments; this
// endpoint needs the actual file bytes server-side to parse, not a URL.
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

// Some clients/OS MIME-type registries don't send a reliable Content-Type for
// .xlsx (e.g. falling back to application/octet-stream), so extension is
// accepted as a fallback rather than trusting mimetype alone.
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const hasKnownMimeType = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const hasKnownExtension = /\.xlsx?$/i.test(file.originalname || '');
    if (!hasKnownMimeType && !hasKnownExtension) {
      return cb(ApiError.badRequest('Only .xlsx/.xls files are accepted'));
    }
    cb(null, true);
  },
});

module.exports = uploadExcel;
