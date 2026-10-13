// server.js
// ============================================================
//  Server Entry Point
//
//  Responsibilities:
//    1. Connect to MongoDB
//    2. Initialize ethers.js Contract Instance
//    3. Test Pinata connection
//    4. Start HTTP Server
//    5. Handle graceful shutdown (SIGINT / SIGTERM)
// ============================================================

require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { initContract } = require("./config/contract");
const { testPinataConnection } = require("./services/pinata.service");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Initialize Blockchain Contract Connection
    try {
      const { contractReadOnly, provider } = initContract();
      
      // Start Event Listener
      const EventListener = require("./listeners/contractEvents");
      const listener = new EventListener(contractReadOnly, provider);
      listener.start();
    } catch (contractErr) {
      logger.warn(`⚠️ Blockchain connection warning: ${contractErr.message}`);
      logger.warn("Server will continue running, but on-chain reads/writes might fail until contract is deployed.");
    }

    // 3. Test Pinata IPFS Connection (optional check)
    if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_API_KEY) {
      await testPinataConnection();
    } else {
      logger.warn("⚠️ Pinata API credentials not provided in .env. IPFS uploads will fail.");
    }

    // 4. Create and start HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
      logger.info(`👉 API Health check available at: http://localhost:${PORT}/health`);
    });

    // ── Graceful Shutdown Handling ────────────────────────────
    const shutdown = (signal) => {
      logger.info(`🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });

      // Force close after 10 seconds timeout
      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (error) {
    logger.error(`❌ Server failed to start: ${error.message}`);
    process.exit(1);
  }
}

startServer();

