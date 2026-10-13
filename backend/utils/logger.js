// utils/logger.js
// ============================================================
//  Winston Logger — structured logging for the backend
//
//  Why use a logger instead of console.log?
//    - Logs can be written to files (not just the terminal)
//    - Each log has a timestamp and severity level
//    - In production you can set level="error" to suppress debug logs
//    - Log files can be shipped to services like Datadog or Papertrail
// ============================================================

const { createLogger, format, transports } = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = format;

// Custom format: "2024-06-01 12:30:00 [ERROR]: Something went wrong"
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

const logger = createLogger({
  // Only log messages at this level or higher
  // Levels: error > warn > info > http > debug
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",

  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),  // Log the full stack trace for errors
    logFormat
  ),

  transports: [
    // Always log to the console
    new transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
    }),
    // Log errors to a file
    new transports.File({
      filename: path.join(__dirname, "../logs/error.log"),
      level: "error",
    }),
    // Log everything to a combined file
    new transports.File({
      filename: path.join(__dirname, "../logs/combined.log"),
    }),
  ],
});

module.exports = logger;

