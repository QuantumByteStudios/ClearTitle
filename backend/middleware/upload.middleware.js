// middleware/upload.middleware.js
// ============================================================
//  Multer File Upload Configuration
//
//  Multer is an Express middleware for handling multipart/form-data
//  (file uploads). We configure it to:
//    1. Store files temporarily in memory (NOT on disk)
//    2. Reject files > 10 MB
//    3. Only accept PDF, JPG, PNG files (by MIME type AND extension)
//
//  Why memory storage?
//    We immediately upload to Pinata/IPFS after receiving the file.
//    There's no need to write it to disk first — it would just be
//    deleted immediately after upload.
// ============================================================

const multer = require("multer");
const { AppError } = require("../utils/errorHandler");

// ── Allowed File Types ────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Multer Configuration ──────────────────────────────────────
const upload = multer({
  // Store file in RAM (as a Buffer) — not on disk
  storage: multer.memoryStorage(),

  // ── File size limit ────────────────────────────────────────
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,  // Only allow 1 file per request
  },

  // ── File type filter ───────────────────────────────────────
  fileFilter: (req, file, callback) => {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new AppError(
          `File type '${file.mimetype}' is not allowed. ` +
          `Only PDF, JPG, and PNG files are accepted.`,
          400
        ),
        false
      );
    }

    // Check file extension (double safety check)
    const ext = "." + file.originalname.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return callback(
        new AppError(`File extension '${ext}' is not allowed.`, 400),
        false
      );
    }

    callback(null, true);  // Accept the file
  },
});

// ── Export ────────────────────────────────────────────────────
// uploadSingle("document") → expects a form field named "document"
const uploadSingle = (fieldName = "document") => upload.single(fieldName);

// Handle Multer's own errors (like file too large)
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(`File too large. Maximum size is 10 MB.`, 400));
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return next(new AppError(`Only 1 file can be uploaded at a time.`, 400));
    }
    return next(new AppError(`File upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = { uploadSingle, handleUploadError };

