// models/Transfer.js
// ============================================================
//  Transfer Model — Mirrors On-Chain TransferRequest Data
//
//  Each document tracks the full lifecycle of one transfer:
//  INITIATED → BUYER_ACCEPTED → APPROVED (or REJECTED / CANCELLED)
//
//  The event listener creates/updates these as events fire on-chain.
// ============================================================

const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema(
  {
    // ── Link to Land ──────────────────────────────────────────
    landId: {
      type: Number,
      required: true,
      index: true,
    },

    // ── Parties ───────────────────────────────────────────────
    fromAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    toAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // ── Price ─────────────────────────────────────────────────
    // Stored as String — same reason as Land.price (uint256 precision)
    price: {
      type: String,
      required: true,
    },

    // ── State ─────────────────────────────────────────────────
    // Mirrors the on-chain TransferState enum
    state: {
      type: String,
      enum: ["NONE", "INITIATED", "BUYER_ACCEPTED", "APPROVED", "REJECTED", "CANCELLED"],
      default: "INITIATED",
      index: true,
    },

    // ── Rejection / Cancellation ──────────────────────────────
    rejectionReason: {
      type: String,
      default: "",
    },

    // ── Blockchain Metadata ───────────────────────────────────
    // We store each transaction hash as the state changes
    initiatedTxHash:     { type: String, default: "" },
    acceptedTxHash:      { type: String, default: "" },
    approvedTxHash:      { type: String, default: "" },
    rejectedTxHash:      { type: String, default: "" },
    cancelledTxHash:     { type: String, default: "" },

    // Block numbers for each state change (useful for the frontend
    // to show a block explorer link)
    initiatedBlock:      { type: Number },
    approvedBlock:       { type: Number },

    // ── Timestamps per State ──────────────────────────────────
    initiatedAt:         { type: Date },
    buyerAcceptedAt:     { type: Date },
    approvedAt:          { type: Date },
    rejectedAt:          { type: Date },
    cancelledAt:         { type: Date },
  },
  {
    timestamps: true,  // createdAt, updatedAt
  }
);

// ── Compound Indexes ──────────────────────────────────────────
// "Show me all active (initiated/buyer_accepted) transfers for admin"
TransferSchema.index({ state: 1, createdAt: -1 });

// "Show me all transfers where I am the buyer"
TransferSchema.index({ toAddress: 1, state: 1 });

// "Show me all transfers where I am the seller"
TransferSchema.index({ fromAddress: 1, state: 1 });

const Transfer = mongoose.model("Transfer", TransferSchema);
module.exports = Transfer;

