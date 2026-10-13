// models/User.js
// ============================================================
//  User Model
//
//  Stores off-chain user profile data.
//  The wallet address IS the user's identity — no username/password.
//
//  Why store this off-chain in MongoDB?
//    - User names, emails are NOT needed on-chain (saves gas).
//    - We need fast lookups by email, role, KYC status.
//    - The blockchain only needs to know the wallet address.
// ============================================================

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // ── Primary Identity ─────────────────────────────────────
    walletAddress: {
      type: String,
      required: [true, "Wallet address is required"],
      unique: true,   // Each wallet maps to exactly one user
      // We store lowercase so lookups are case-insensitive
      // (0xABC and 0xabc are the same Ethereum address)
      lowercase: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format"],
    },

    // ── Profile ───────────────────────────────────────────────
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      default: "",
    },

    // ── Role ─────────────────────────────────────────────────
    // Note: The smart contract enforces REGISTRAR_ROLE on-chain.
    // This role field is ONLY for the backend (to decide which
    // dashboard to show, which APIs to allow).
    // A corrupt backend admin changing this role to "admin"
    // CANNOT call contract functions — that's still enforced on-chain.
    role: {
      type: String,
      enum: {
        values: ["admin", "seller", "buyer", "public"],
        message: "Role must be admin, seller, buyer, or public",
      },
      default: "public",
    },

    // ── KYC Status ───────────────────────────────────────────
    // KYC = Know Your Customer — government ID verification
    kycStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },

    // ── Auth: Nonce ───────────────────────────────────────────
    // A random string the user must sign with MetaMask to prove
    // they own the wallet. Changed after every login to prevent
    // replay attacks (using the same old signature again).
    nonce: {
      type: String,
      default: () => Math.floor(Math.random() * 1_000_000).toString(),
    },

    // ── Timestamps ───────────────────────────────────────────
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Mongoose auto-adds createdAt and updatedAt fields
    timestamps: true,
    // Transform the JSON output: remove __v (internal version key)
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        // Never expose the nonce in API responses
        delete ret.nonce;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Indexes speed up queries dramatically.
// walletAddress is already indexed (unique: true does this).
UserSchema.index({ role: 1 });       // Fast queries like "find all sellers"
UserSchema.index({ kycStatus: 1 });  // Fast queries for pending KYC

// ── Instance Methods ──────────────────────────────────────────
/**
 * Generate a new random nonce.
 * Called before the user logs in — ensures each sign challenge is unique.
 */
UserSchema.methods.generateNonce = function () {
  this.nonce = `Sign this message to log in to Land Registry.\n\nNonce: ${
    Math.floor(Math.random() * 1_000_000_000)
  }\n\nThis request will expire in 5 minutes.`;
  return this.nonce;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;

