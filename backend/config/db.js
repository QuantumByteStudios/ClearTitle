// config/db.js
// ============================================================
//  MongoDB Connection using Mongoose
// ============================================================

const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // Check if URI is still the unconfigured placeholder
  if (!uri || uri.includes("cluster0.xxxxx.mongodb.net")) {
    console.warn("\n=======================================================");
    console.warn("⚠️  MONGODB_URI in backend/.env is not configured yet!");
    console.warn("   Using default local MongoDB: mongodb://127.0.0.1:27017/landregistry");
    console.warn("   If you have MongoDB Atlas, paste your real URI into backend/.env");
    console.warn("=======================================================\n");
  }

  const connectionString = (!uri || uri.includes("cluster0.xxxxx.mongodb.net"))
    ? "mongodb://127.0.0.1:27017/landregistry"
    : uri;

  try {
    const conn = await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Safely remove legacy unique index on documents if present in MongoDB Atlas
    try {
      await conn.connection.collection("documents").dropIndex("ipfsHash_1");
    } catch (_) {}

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected.");
    });
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);
    console.error("👉 TO FIX THIS:");
    console.error("   1. Open: backend/.env");
    console.error("   2. Replace MONGODB_URI with your MongoDB Atlas connection string");
    console.error("      (e.g., mongodb+srv://username:password@cluster0.abcde.mongodb.net/landregistry)");
    console.error("   3. Or install MongoDB Community locally.\n");
    throw error;
  }
};

module.exports = connectDB;
