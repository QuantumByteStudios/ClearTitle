// middleware/auth.middleware.js
// ============================================================
//  JWT Authentication Middleware
//
//  Protects routes that require a logged-in user.
//  Reads the JWT from the Authorization header:
//    Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
//
//  If valid: attaches req.user = { address, role } and calls next()
//  If invalid: responds with 401 Unauthorized
// ============================================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError, catchAsync } = require("../utils/errorHandler");

/**
 * Require the user to be authenticated (have a valid JWT).
 * Use on any route that needs a logged-in user.
 *
 * Example:
 *   router.get("/my-lands", protect, landController.getMyLands);
 */
const protect = catchAsync(async (req, res, next) => {
  // ── Step 1: Extract token from header ────────────────────────
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not logged in. Please connect your wallet.", 401));
  }

  // ── Step 2: Verify the token ──────────────────────────────────
  // jwt.verify throws an error if the token is expired or tampered with.
  // Those errors are caught by our errorHandler (TokenExpiredError, JsonWebTokenError)
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // ── Step 3: Check the user still exists in DB ─────────────────
  // Edge case: user was deleted after the JWT was issued
  const user = await User.findOne({ walletAddress: decoded.address });
  if (!user) {
    return next(new AppError("The user associated with this token no longer exists.", 401));
  }

  // ── Step 4: Attach user info to request ───────────────────────
  // Every subsequent middleware/controller can access req.user
  req.user = {
    address: user.walletAddress,
    role:    user.role,
    id:      user._id,
  };

  next();
});

/**
 * Optionally authenticate — doesn't fail if no token provided.
 * Useful for public endpoints that show more data if you're logged in.
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ walletAddress: decoded.address });
      if (user) {
        req.user = { address: user.walletAddress, role: user.role, id: user._id };
      }
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next();
});

module.exports = { protect, optionalAuth };

