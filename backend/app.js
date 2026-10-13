// app.js
// ============================================================
//  Express Application Setup
//
//  This file configures the Express app: middleware, routes, error handling.
//  It does NOT start the server (that's server.js).
//  Separating them makes testing easier.
// ============================================================

require("dotenv").config();

const express      = require("express");
const helmet       = require("helmet");
const cors         = require("cors");
const rateLimit    = require("express-rate-limit");
const { errorHandler } = require("./utils/errorHandler");
const logger       = require("./utils/logger");

// ── Route Imports ─────────────────────────────────────────────
const authRoutes         = require("./routes/auth.routes");
const landRoutes         = require("./routes/land.routes");
const documentRoutes     = require("./routes/document.routes");
const transferRoutes     = require("./routes/transfer.routes");
const adminRoutes        = require("./routes/admin.routes");
const notificationRoutes = require("./routes/notification.routes");

const app = express();

// ============================================================
//  1. SECURITY MIDDLEWARE
// ============================================================

// Helmet sets ~14 security-related HTTP headers automatically.
// e.g. X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security
app.use(helmet());

// CORS: allow requests only from the frontend URL
app.use(
  cors({
    origin:      process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,  // Allow cookies/Authorization header
    methods:     ["GET", "POST", "PATCH", "DELETE"],
  })
);

// Rate limiting: max 100 requests per 15 minutes per IP
// Prevents brute-force and DoS attacks
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: "fail", message: "Too many requests. Please try again later." },
});
app.use("/api", limiter);

// Stricter rate limit for auth endpoints (prevent nonce spam)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: "fail", message: "Too many auth requests. Please wait." },
});
app.use("/api/auth", authLimiter);

// ============================================================
//  2. BODY PARSERS
// ============================================================

// Parse JSON bodies (req.body). Limit to 10kb to prevent payload attacks.
app.use(express.json({ limit: "10kb" }));

// Parse URL-encoded form data (for non-file form submissions)
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ============================================================
//  3. REQUEST LOGGER (development only)
// ============================================================
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ============================================================
//  4. HEALTH CHECK (no auth required)
// ============================================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status:  "ok",
    service: "Land Registry Backend",
    time:    new Date().toISOString(),
  });
});

// ============================================================
//  5. API ROUTES
// ============================================================
app.use("/api/auth",          authRoutes);
app.use("/api/lands",         landRoutes);
app.use("/api/documents",     documentRoutes);
app.use("/api/transfers",     transferRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/notifications", notificationRoutes);

// ============================================================
//  6. 404 HANDLER — for routes that don't exist
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    status:  "fail",
    message: `Route ${req.originalUrl} not found on this server.`,
  });
});

// ============================================================
//  7. CENTRALIZED ERROR HANDLER (must be LAST)
// ============================================================
app.use(errorHandler);

module.exports = app;

