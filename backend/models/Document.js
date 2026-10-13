// models/Document.js
// ============================================================
//  Document Model — Tracks Files Uploaded to IPFS
//
//  When a seller uploads a deed PDF, we:
//    1. Compute its SHA-256 hash (document fingerprint)
//    2. Upload it to Pinata/IPFS
//    3. Save the metadata here in MongoDB
//    4. Return the IPFS hash to the frontend
//       (which then passes it to the smart contract)
//
//  The SHA-256 hash is the PROOF the document hasn't been tampered with.
//  If someone changes even one character in the PDF, the SHA-256 changes.
// ============================================================

const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    // ── Link to Land ──────────────────────────────────────────
    landId: {
      type: Number,
      required: true,
      index: true,
    },

    // ── File Metadata ─────────────────────────────────────────
    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,   // The file name as the user uploaded it
      trim: true,
    },

    mimeType: {
      type: String,   // e.g. "application/pdf", "image/jpeg"
      enum: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
      required: true,
    },

    fileSize: {
      type: Number,   // File size in bytes
      required: true,
    },

    // ── Cryptographic Proof ───────────────────────────────────
    // SHA-256 is computed by the backend BEFORE uploading to IPFS.
    // This lets anyone re-download the file from IPFS and verify
    // it hasn't changed by recomputing the SHA-256.
    sha256Hash: {
      type: String,
      required: true,
      trim: true,
    },

    // ── IPFS ──────────────────────────────────────────────────
    // The CID (Content Identifier) returned by Pinata after upload.
    // Format: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
    ipfsHash: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Full gateway URL to view the file
    ipfsUrl: {
      type: String,
      trim: true,
    },

    // ── Uploader ──────────────────────────────────────────────
    uploadedBy: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // ── Status ────────────────────────────────────────────────
    // "active" = the document is the current deed for this land
    // "superseded" = a newer document was uploaded (document was updated)
    status: {
      type: String,
      enum: ["active", "superseded"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────
DocumentSchema.index({ landId: 1, status: 1 });
DocumentSchema.index({ uploadedBy: 1 });
DocumentSchema.index({ sha256Hash: 1 });  // Quick duplicate detection

const Document = mongoose.model("Document", DocumentSchema);

// Drop legacy unique index if it still exists in the MongoDB Atlas collection
Document.collection.dropIndex("ipfsHash_1").catch(() => {});

module.exports = Document;

