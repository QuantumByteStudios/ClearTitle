// routes/document.routes.js
const express = require("express");
const router  = express.Router();
const documentController        = require("../controllers/document.controller");
const { protect }               = require("../middleware/auth.middleware");
const { requireRole }           = require("../middleware/role.middleware");
const { uploadSingle, handleUploadError } = require("../middleware/upload.middleware");

// POST /documents/upload
// Authenticated users can upload documents
router.post(
  "/upload",
  protect,
  uploadSingle("document"),   // Multer processes the file
  handleUploadError,          // Handle Multer-specific errors
  documentController.uploadDocument
);

// GET /documents/:landId → all documents for a land
router.get("/:landId", protect, documentController.getDocumentsByLand);

module.exports = router;

