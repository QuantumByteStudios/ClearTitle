// utils/errorHandler.js
// ============================================================
//  Centralized Error Handler — Express error middleware
//
//  In Express, any middleware with FOUR parameters (err, req, res, next)
//  is automatically treated as an error handler. We register it LAST
//  in app.js, after all routes.
//
//  Usage in controllers:
//    throw new AppError("Land not found", 404);
//    next(error);  ← passes the error here
// ============================================================

const logger = require("./logger");

// ── Custom Error Class ─────────────────────────────────────────
// Extends the native Error to add an HTTP status code and
// an "isOperational" flag (operational = expected business error,
// not a programmer bug).
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";

    // Capture the stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Error Handler Middleware ───────────────────────────────────
// Express calls this whenever next(error) is called or an
// async controller throws an unhandled error.
const errorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Log non-operational errors (programming bugs) at error level
  if (!err.isOperational) {
    logger.error(`💥 UNEXPECTED ERROR: ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`⚠️  Operational Error [${err.statusCode}]: ${err.message}`);
  }

  // ── Handle specific MongoDB / Mongoose errors ────────────────
  // Convert cryptic Mongoose errors into friendly messages

  // Duplicate key error (e.g. duplicate surveyNumber)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    err = new AppError(`Duplicate value for field '${field}': '${value}'`, 409);
  }

  // Mongoose validation error (required field missing, wrong enum, etc.)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    err = new AppError(`Validation failed: ${messages.join(". ")}`, 400);
  }

  // Invalid MongoDB ObjectId (e.g. /lands/not-a-valid-id)
  if (err.name === "CastError") {
    err = new AppError(`Invalid value for field '${err.path}': ${err.value}`, 400);
  }

  // JWT expired
  if (err.name === "TokenExpiredError") {
    err = new AppError("Your session has expired. Please log in again.", 401);
  }

  // JWT invalid
  if (err.name === "JsonWebTokenError") {
    err = new AppError("Invalid authentication token. Please log in again.", 401);
  }

  // ── Send Response ─────────────────────────────────────────────
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    // Only show stack trace in development (never in production)
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// ── Async Wrapper ──────────────────────────────────────────────
// Instead of wrapping every controller in try/catch, use this:
// router.get("/lands", catchAsync(async (req, res) => { ... }))
// Any thrown error is automatically passed to next()
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, catchAsync };

