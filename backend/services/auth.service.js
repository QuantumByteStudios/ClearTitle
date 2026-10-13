// services/auth.service.js
// ============================================================
//  Auth Service — Wallet-Based Login Logic
//
//  FLOW:
//    1. Frontend calls GET /auth/nonce/:address
//       → Backend looks up (or creates) the user, generates a nonce
//       → Returns { nonce: "Sign this message to log in: 123456..." }
//
//    2. User signs the nonce in MetaMask
//       → MetaMask uses the private key to create a signature
//       → Signature is a 65-byte hex string (0xABCD...)
//
//    3. Frontend calls POST /auth/verify { address, signature }
//       → Backend uses ethers.js to RECOVER the signer address from the signature
//       → If recovered address === claimed address: it's really them!
//       → Issue a JWT. Regenerate the nonce (single-use)
//
//  WHY THIS IS SECURE:
//    - Only the wallet owner can produce a valid signature for that nonce.
//    - The nonce is regenerated after each login so old signatures are useless.
//    - Even if an attacker intercepts the signature, they can't reuse it.
// ============================================================

const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/errorHandler");
const logger = require("../utils/logger");

/**
 * Step 1: Get or create a user and return a unique sign message (nonce).
 *
 * @param {string} address - Wallet address (lowercase)
 * @returns {{ nonce: string, isNewUser: boolean }}
 */
const getNonce = async (address) => {
  const normalizedAddress = address.toLowerCase();

  // Find or create the user in MongoDB
  let user = await User.findOne({ walletAddress: normalizedAddress });
  let isNewUser = false;

  if (!user) {
    // First time this wallet connects — create a profile
    user = new User({ walletAddress: normalizedAddress });
    isNewUser = true;
    logger.info(`👤 New user created: ${normalizedAddress}`);
  }

  // Generate a fresh nonce (overwrites the old one)
  const nonce = user.generateNonce();
  await user.save();

  return { nonce, isNewUser };
};

/**
 * Step 2: Verify the signature and issue a JWT.
 *
 * @param {string} address   - Wallet address claimed by the user
 * @param {string} signature - Signature produced by MetaMask
 * @param {string} [role]    - Requested user role (e.g., seller, buyer, admin)
 * @returns {{ token: string, user: object }}
 */
const verifySignatureAndLogin = async (address, signature, role) => {
  const normalizedAddress = address.toLowerCase();

  // Find the user (must exist — they called getNonce first)
  const user = await User.findOne({ walletAddress: normalizedAddress });
  if (!user) {
    throw new AppError("User not found. Please request a nonce first.", 404);
  }

  // ── Recover the signer address from the signature ────────────
  // ethers.js's verifyMessage() hashes the message the same way
  // MetaMask does (adds the "\x19Ethereum Signed Message:\n" prefix)
  // and recovers the public key from the signature math.
  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(user.nonce, signature);
  } catch {
    throw new AppError("Invalid signature format.", 400);
  }

  // ── Compare addresses ─────────────────────────────────────────
  if (recoveredAddress.toLowerCase() !== normalizedAddress) {
    throw new AppError(
      "Signature verification failed. The signature does not match this wallet address.",
      401
    );
  }

  // ── Signature is valid! ───────────────────────────────────────
  // Regenerate nonce so this signature can never be reused
  user.generateNonce();
  user.lastLoginAt = new Date();
  if (role && ["admin", "seller", "buyer", "public"].includes(role)) {
    user.role = role;
  }
  await user.save();

  // ── Issue JWT ─────────────────────────────────────────────────
  const token = jwt.sign(
    {
      address: normalizedAddress,
      role:    user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  logger.info(`✅ User logged in: ${normalizedAddress} (role: ${user.role})`);

  return {
    token,
    user: {
      walletAddress: user.walletAddress,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      kycStatus:     user.kycStatus,
    },
  };
};

module.exports = { getNonce, verifySignatureAndLogin };

