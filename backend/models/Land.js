// models/Land.js
// ============================================================
//  Land Model — MongoDB Mirror of the On-Chain Land Data
//
//  WHY mirror on-chain data to MongoDB?
//    - Blockchain queries are SLOW and expensive (calling a node RPC).
//    - MongoDB can do complex queries: filter by location, sort by price,
//      paginate, full-text search — things you CANNOT do on Solidity.
//    - We keep this in sync using the Event Listener (Phase 6).
//
//  The SINGLE SOURCE OF TRUTH is still the blockchain.
//  If MongoDB ever gets out of sync, the event listener re-syncs it.
// ============================================================

const mongoose = require("mongoose");

const LandSchema = new mongoose.Schema(
  {
    // ── On-Chain Identity ─────────────────────────────────────
    landId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // ── Land Details ─────────────────────────────────────────
    surveyNumber: {
      type: String,
      required: [true, "Survey number is required"],
      unique: true,
      trim: true,
      index: true,  // We search by survey number often
    },

    area: {
      type: Number,   // Area in square meters
      required: true,
      min: [1, "Area must be at least 1 sq meter"],
    },

    location: {
      type: String,
      required: true,
      trim: true,
      index: "text", // Enables MongoDB text search (search by keyword in location)
    },

    // ── Ownership ─────────────────────────────────────────────
    ownerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,  // Fast lookup: "all lands owned by 0xABC"
    },

    // ── Pricing ───────────────────────────────────────────────
    // We store price as a String because Solidity uses uint256 (Wei),
    // which can be larger than JavaScript's safe integer limit.
    // On the frontend, convert with ethers.formatEther(price).
    price: {
      type: String,
      required: true,
    },

    // ── Document ──────────────────────────────────────────────
    ipfsHash: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Status ────────────────────────────────────────────────
    // Mirror of the on-chain LandStatus enum
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED", "DISPUTED", "FROZEN"],
      default: "PENDING",
      index: true,  // Fast queries: "show all PENDING lands to admin"
    },

    // ── Blockchain Metadata ───────────────────────────────────
    // Stored so we can link to the block explorer
    txHash: {
      type: String,   // Transaction hash of the registerLand() call
      trim: true,
    },

    blockNumber: {
      type: Number,   // Which block this was confirmed in
    },

    // ── Rejection Reason ──────────────────────────────────────
    rejectionReason: {
      type: String,
      default: "",
    },

    // ── Flags ────────────────────────────────────────────────
    isListedForSale: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,  // createdAt, updatedAt
    toJSON: { virtuals: true },
  }
);

// ── Compound Indexes ──────────────────────────────────────────
// For the admin "pending lands" view: filter by status sorted by createdAt
LandSchema.index({ status: 1, createdAt: -1 });

// For the marketplace: show verified + listed lands sorted by price
LandSchema.index({ status: 1, isListedForSale: 1 });

// ── Text Search Index ─────────────────────────────────────────
// Allows: Land.find({ $text: { $search: "MG Road Bengaluru" } })
LandSchema.index({ location: "text", surveyNumber: "text" });

// ── Static Methods ────────────────────────────────────────────

/**
 * Get lands by owner address with pagination
 * @param {string} address  - Wallet address (lowercased)
 * @param {number} page     - Page number (1-indexed)
 * @param {number} limit    - Records per page
 */
LandSchema.statics.findByOwner = function (address, page = 1, limit = 10) {
  return this.find({ ownerAddress: address.toLowerCase() })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

/**
 * Get all lands pending admin verification
 */
LandSchema.statics.findPending = function () {
  return this.find({ status: "PENDING" }).sort({ createdAt: 1 }); // oldest first
};

const Land = mongoose.model("Land", LandSchema);
module.exports = Land;

