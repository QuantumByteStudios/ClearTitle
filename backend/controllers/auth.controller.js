// controllers/auth.controller.js
const authService = require("../services/auth.service");
const { catchAsync, AppError } = require("../utils/errorHandler");

/**
 * GET /auth/nonce/:address
 * Returns a unique message the user must sign with MetaMask.
 */
const getNonce = catchAsync(async (req, res) => {
  const { address } = req.params;
  const { nonce, isNewUser } = await authService.getNonce(address);

  res.status(200).json({
    status:    "success",
    nonce,
    isNewUser,
  });
});

/**
 * POST /auth/verify
 * Body: { address, signature }
 * Verifies the signature and returns a JWT.
 */
const verifySignature = catchAsync(async (req, res) => {
  const { address, signature, role } = req.body;
  const { token, user } = await authService.verifySignatureAndLogin(address, signature, role);

  res.status(200).json({
    status: "success",
    token,
    user,
  });
});

/**
 * GET /auth/me
 * Returns the currently logged-in user's profile.
 * Requires: protect middleware
 */
const getMe = catchAsync(async (req, res) => {
  const User = require("../models/User");
  const user = await User.findOne({ walletAddress: req.user.address });

  res.status(200).json({
    status: "success",
    user,
  });
});

/**
 * PATCH /auth/role
 * Allows updating the role for the authenticated user (e.g. seller, buyer, admin, public).
 * Requires: protect middleware
 */
const updateRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  if (!role || !["admin", "seller", "buyer", "public"].includes(role)) {
    throw new AppError("Invalid role. Must be admin, seller, buyer, or public", 400);
  }

  const User = require("../models/User");
  const user = await User.findOneAndUpdate(
    { walletAddress: req.user.address.toLowerCase() },
    { role },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    user: {
      walletAddress: user.walletAddress,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      kycStatus:     user.kycStatus,
    },
  });
});

module.exports = { getNonce, verifySignature, getMe, updateRole };

