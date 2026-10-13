// models/SyncState.js
// ============================================================
//  SyncState Model — Blockchain Event Listener Checkpoint
//
//  The Event Listener (Phase 6) continuously watches the blockchain
//  for events (LandRegistered, LandVerified, etc.) and saves them
//  to MongoDB.
//
//  Problem: If the backend server RESTARTS, it would re-process
//  every event from block 0 — re-saving all old data!
//
//  Solution: Store the "lastProcessedBlock" in MongoDB.
//  When the listener restarts, it picks up from where it left off.
//
//  There will be only ONE document in this collection —
//  it's a single global state tracker.
// ============================================================

const mongoose = require("mongoose");

const SyncStateSchema = new mongoose.Schema(
  {
    // ── Identifier ────────────────────────────────────────────
    // We use a fixed key "main" so there's always exactly one document.
    // If you had multiple contracts, you'd have one per contract.
    key: {
      type: String,
      default: "main",
      unique: true,
    },

    // ── Progress Tracking ─────────────────────────────────────
    // The last block number that was fully processed.
    // On restart: start scanning from (lastProcessedBlock + 1).
    lastProcessedBlock: {
      type: Number,
      default: 0,
    },

    // The block number where the contract was deployed.
    // We never scan before this block (nothing to find there).
    deploymentBlock: {
      type: Number,
      default: 0,
    },

    // ── Health Check ──────────────────────────────────────────
    // When did the listener last successfully process a block?
    // If this is very old, the listener might be stuck.
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    // Total events ever processed (for debugging / monitoring)
    totalEventsProcessed: {
      type: Number,
      default: 0,
    },

    // Is the listener currently running?
    isListening: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Static Methods ────────────────────────────────────────────

/**
 * Get the single sync state document.
 * Creates it with defaults if it doesn't exist yet (first run).
 *
 * @param {number} deploymentBlock - Block where contract was deployed
 */
SyncStateSchema.statics.getOrCreate = async function (deploymentBlock = 0) {
  let state = await this.findOne({ key: "main" });
  if (!state) {
    state = await this.create({
      key: "main",
      lastProcessedBlock: deploymentBlock,
      deploymentBlock,
    });
    console.log(`📌 SyncState created. Starting from block ${deploymentBlock}`);
  }
  return state;
};

/**
 * Update the last processed block number.
 * Called by the event listener after processing each batch.
 *
 * @param {number} blockNumber
 */
SyncStateSchema.statics.updateBlock = function (blockNumber) {
  return this.updateOne(
    { key: "main" },
    {
      $set: {
        lastProcessedBlock: blockNumber,
        lastSyncedAt: new Date(),
      },
      $inc: { totalEventsProcessed: 1 },
    }
  );
};

const SyncState = mongoose.model("SyncState", SyncStateSchema);
module.exports = SyncState;

