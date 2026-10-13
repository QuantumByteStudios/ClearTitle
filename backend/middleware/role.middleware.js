// middleware/role.middleware.js
// ============================================================
//  Role-Based Access Control Middleware
//
//  Used AFTER protect() to restrict routes to specific roles.
//
//  Example:
//    router.get("/admin/stats", protect, requireRole("admin"), controller)
//    router.post("/upload", protect, requireRole("seller", "admin"), controller)
//
//  Note: This enforces roles at the API level.
//        The REAL enforcement for critical actions is still the smart contract.
// ============================================================

const { AppError } = require("../utils/errorHandler");

/**
 * Middleware factory: restrict route to users with one of the given roles.
 * @param {...string} roles - Allowed roles (e.g., "admin", "seller", "buyer")
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    // protect() must run before this — it attaches req.user
    if (!req.user) {
      return next(new AppError("Not authenticated.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: [${roles.join(", ")}]. Your role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};

module.exports = { requireRole };

