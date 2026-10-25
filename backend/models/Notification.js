// models/Notification.js
// ============================================================
//  Notification Model — In-App Alerts for Users
//
//  Notifications are created automatically by the Event Listener
//  when important on-chain events happen:
//    - Seller gets notified when their land is verified/rejected
//    - Buyer gets notified when a transfer is initiated to them
//    - Seller gets notified when the buyer accepts or registrar approves
//    - Both parties notified when transfer is complete
// ============================================================

const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // ── Recipient ─────────────────────────────────────────────
    userAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,   // Fast: "get all notifications for 0xABC"
    },

    // ── Content ───────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // ── Type ──────────────────────────────────────────────────
    // Used by the frontend to show the right icon
    type: {
      type: String,
      enum: [
        "LAND_VERIFIED",
        "LAND_REJECTED",
        "LAND_FROZEN",
        "LAND_DISPUTED",
        "TRANSFER_INITIATED",    // Buyer receives this
        "TRANSFER_ACCEPTED",     // Seller receives this
        "TRANSFER_APPROVED",     // Both receive this
        "TRANSFER_REJECTED",     // Both receive this
        "TRANSFER_CANCELLED",    // Buyer receives this
        "SYSTEM",
      ],
      required: true,
    },

    // ── Link ──────────────────────────────────────────────────
    // Optional deep-link so clicking the notification goes to
    // the right page: e.g., "/lands/42" or "/transfers/7"
    link: {
      type: String,
      default: null,
    },

    // ── Related Data ──────────────────────────────────────────
    landId: {
      type: Number,
      default: null,
    },

    // ── Read Status ───────────────────────────────────────────
    read: {
      type: Boolean,
      default: false,
      index: true,   // Fast: "count unread notifications"
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound Indexes ──────────────────────────────────────────
// The notification bell needs to load fast: show unread first
NotificationSchema.index({ userAddress: 1, read: 1, createdAt: -1 });

// ── TTL Index ─────────────────────────────────────────────────
// Auto-delete notifications older than 90 days to keep DB lean.
// (90 days = 7,776,000 seconds)
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7_776_000 }
);

// ── Static Methods ────────────────────────────────────────────

/**
 * Create and save a notification (convenience method)
 */
NotificationSchema.statics.notify = async function ({
  userAddress,
  title,
  message,
  type,
  landId = null,
  link = null,
}) {
  return this.create({ userAddress: userAddress.toLowerCase(), title, message, type, landId, link });
};

/**
 * Count unread notifications for a user
 */
NotificationSchema.statics.countUnread = function (userAddress) {
  return this.countDocuments({
    userAddress: userAddress.toLowerCase(),
    read: false,
  });
};

const Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;

