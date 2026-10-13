// models/AuditLog.js
// ============================================================
//  AuditLog Model — Immutable Record of All Admin Actions
//
//  Every time an admin does something important (verifying a land,
//  freezing a land, approving a transfer), we write an audit log.
//
//  Key principle: Audit logs should NEVER be deleted.
//  This is the accountability trail for the government registrar.
//
//  Even though the blockchain has events, the audit log here stores:
//    - Who did it (JWT identity)
//    - What they did (human-readable action)
//    - When (createdAt)
//    - What was affected (landId, txHash)
//    - Extra context (metadata)
// ============================================================

const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    // ── Who Did It ────────────────────────────────────────────
    performedBy: {
      type: String,   // Wallet address of the admin
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ── What They Did ─────────────────────────────────────────
    action: {
      type: String,
      required: true,
      enum: [
        "LAND_VERIFIED",
        "LAND_REJECTED",
        "LAND_FROZEN",
        "LAND_UNFROZEN",
        "LAND_DISPUTED",
        "TRANSFER_APPROVED",
        "TRANSFER_REJECTED",
        "ROLE_GRANTED",
        "ROLE_REVOKED",
        "CONTRACT_PAUSED",
        "CONTRACT_UNPAUSED",
        "USER_KYC_APPROVED",
        "USER_KYC_REJECTED",
        "DOCUMENT_UPLOADED",
        "EXPORT_GENERATED",
      ],
      index: true,
    },

    // ── What Was Affected ─────────────────────────────────────
    landId: {
      type: Number,
      default: null,
      index: true,
    },

    targetAddress: {
      type: String,   // For role grants/revokes: which wallet was affected
      lowercase: true,
      default: null,
    },

    // ── Blockchain Link ───────────────────────────────────────
    txHash: {
      type: String,   // The blockchain transaction hash (if applicable)
      default: null,
    },

    blockNumber: {
      type: Number,
      default: null,
    },

    // ── Extra Context ─────────────────────────────────────────
    // Flexible object to store any extra info specific to the action
    // e.g., { reason: "Documents forged", rejectionType: "FRAUD" }
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── IP Address ────────────────────────────────────────────
    // Stored for extra accountability (who logged in from where)
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    // Audit logs must NEVER be modified after creation
    // We'll enforce this in the service layer
  }
);

// ── Indexes ───────────────────────────────────────────────────
AuditLogSchema.index({ createdAt: -1 });           // Most recent first
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ landId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
module.exports = AuditLog;

