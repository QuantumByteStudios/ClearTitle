// controllers/document.controller.js
// ============================================================
//  Document Upload Controller
//
//  Flow:
//    1. Multer middleware runs first → file is in req.file.buffer
//    2. This controller uploads it to Pinata
//    3. Saves metadata to MongoDB Documents collection
//    4. Returns { ipfsHash, ipfsUrl, sha256Hash } to the frontend
//    5. Frontend uses ipfsHash when calling registerLand() on the contract
// ============================================================

const { uploadToPinata } = require("../services/pinata.service");
const Document          = require("../models/Document");
const { catchAsync, AppError } = require("../utils/errorHandler");
const { writeAuditLog } = require("../services/audit.service");

/**
 * POST /documents/upload
 * Requires: protect + requireRole("seller", "admin") + uploadSingle("document")
 *
 * Form fields:
 *   - document (file)
 *   - landId   (optional — if the land is already registered)
 */
const uploadDocument = catchAsync(async (req, res, next) => {
  // Multer puts the file here after memory storage
  if (!req.file) {
    return next(new AppError("Please attach a file to upload.", 400));
  }

  const { buffer, originalname, mimetype, size } = req.file;
  const landId = req.body.landId ? Number(req.body.landId) : 0;

  // Upload to Pinata and get the hash
  const { ipfsHash, ipfsUrl, sha256Hash, fileSize } = await uploadToPinata(
    buffer,
    originalname,
    landId
  );

  // Save or reuse metadata in MongoDB (handles re-uploads of identical files gracefully)
  let doc = null;
  try {
    doc = await Document.findOne({ ipfsHash });
    if (doc) {
      doc.landId = landId;
      doc.fileName = `${Date.now()}-${originalname}`;
      doc.originalName = originalname;
      doc.mimeType = mimetype;
      doc.fileSize = size;
      doc.sha256Hash = sha256Hash;
      doc.ipfsUrl = ipfsUrl;
      doc.uploadedBy = req.user.address;
      doc.status = "active";
      await doc.save();
    } else {
      doc = await Document.create({
        landId,
        fileName: `${Date.now()}-${originalname}`,
        originalName: originalname,
        mimeType: mimetype,
        fileSize: size,
        sha256Hash,
        ipfsHash,
        ipfsUrl,
        uploadedBy: req.user.address,
        status: "active",
      });
    }
  } catch (dbErr) {
    if (dbErr.code === 11000) {
      doc = await Document.findOne({ ipfsHash }) || (await Document.findOne({ sha256Hash }));
    } else {
      throw dbErr;
    }
  }

  // If user role was "public", promote to "seller"
  const User = require("../models/User");
  await User.findOneAndUpdate(
    { walletAddress: req.user.address.toLowerCase(), role: "public" },
    { role: "seller" }
  );

  await writeAuditLog({
    action:      "DOCUMENT_UPLOADED",
    performedBy: req.user.address,
    landId:      landId || null,
    metadata:    { ipfsHash, sha256Hash, fileName: originalname },
    ipAddress:   req.ip,
  });

  res.status(201).json({
    status:     "success",
    message:    "Document uploaded to IPFS successfully",
    ipfsHash,
    ipfsUrl,
    sha256Hash,
    fileSize,
    documentId: doc?._id || null,
  });
});

/**
 * GET /documents/:landId
 * Returns all documents for a specific land.
 */
const getDocumentsByLand = catchAsync(async (req, res) => {
  const landId = Number(req.params.landId);
  const docs = await Document.find({ landId }).sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    count:  docs.length,
    data:   docs,
  });
});

module.exports = { uploadDocument, getDocumentsByLand };

