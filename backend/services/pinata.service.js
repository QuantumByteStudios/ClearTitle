// services/pinata.service.js
// ============================================================
//  Pinata IPFS Upload Service
//
//  Pinata is a "pinning service" — it keeps your files alive on IPFS.
//  Without pinning, IPFS files can disappear when no node wants them.
//
//  FLOW:
//    1. Receive file buffer from Multer (in memory)
//    2. Compute SHA-256 hash of the buffer (document fingerprint)
//    3. Upload to Pinata via their REST API
//    4. Return { ipfsHash, ipfsUrl, sha256Hash }
//    5. The frontend passes ipfsHash to the smart contract
//
//  WHY IPFS?
//    - Content-addressed: the CID (hash) IS the address.
//      If the file changes, the CID changes. Tamper-proof.
//    - Decentralized: the file lives on multiple nodes worldwide.
//    - Permanent: as long as it's pinned, it won't disappear.
// ============================================================

const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
const { AppError } = require("../utils/errorHandler");
const logger = require("../utils/logger");

const PINATA_BASE_URL = "https://api.pinata.cloud";

/**
 * Upload a file buffer to Pinata IPFS.
 *
 * @param {Buffer} fileBuffer    - The file data (from multer.memoryStorage)
 * @param {string} originalName  - Original file name (for Pinata metadata)
 * @param {string} landId        - Land ID (stored as metadata on Pinata)
 * @returns {{ ipfsHash, ipfsUrl, sha256Hash, fileSize }}
 */
const uploadToPinata = async (fileBuffer, originalName, landId = "unknown") => {
  // ── Step 1: Compute SHA-256 hash ─────────────────────────────
  // crypto.createHash("sha256") creates a hasher.
  // .update(buffer) feeds the file data in.
  // .digest("hex") outputs the hash as a hex string.
  const sha256Hash = crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");

  logger.info(`📄 Uploading file: ${originalName} (SHA-256: ${sha256Hash.slice(0, 16)}...)`);

  // ── Step 2: Build the multipart form data ────────────────────
  // Pinata expects a multipart POST with the file and JSON metadata.
  const formData = new FormData();

  // Append the file buffer
  formData.append("file", fileBuffer, {
    filename:    originalName,
    contentType: "application/octet-stream",
  });

  // Pinata metadata — stored alongside the file (not on-chain)
  const metadata = JSON.stringify({
    name: `LandRegistry-${landId}-${Date.now()}`,
    keyvalues: {
      landId:      String(landId),
      sha256:      sha256Hash,
      uploadedAt:  new Date().toISOString(),
    },
  });
  formData.append("pinataMetadata", metadata);

  // Pin options (default pinning to IPFS)
  const options = JSON.stringify({ cidVersion: 1 });
  formData.append("pinataOptions", options);

  // ── Step 3: POST to Pinata API ───────────────────────────────
  let response;
  try {
    response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key:        process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
        maxBodyLength: Infinity,  // Allow large files
        timeout: 30_000,          // 30 second timeout
      }
    );
  } catch (err) {
    const msg = err.response?.data?.error?.details || err.message;
    logger.error(`❌ Pinata upload failed: ${msg}`);
    
    // In development or if Pinata keys are placeholders, fallback gracefully to mock IPFS CID
    if (
      process.env.NODE_ENV === "development" ||
      !process.env.PINATA_API_KEY ||
      process.env.PINATA_API_KEY.includes("your_pinata")
    ) {
      logger.warn("⚠️ Using development fallback IPFS CID (Pinata credentials unconfigured or failed).");
      const mockCid = `bafybeic${sha256Hash.slice(0, 48)}`;
      return {
        ipfsHash: mockCid,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${mockCid}`,
        sha256Hash,
        fileSize: fileBuffer.length,
      };
    }
    throw new AppError(`IPFS upload failed: ${msg}`, 502);
  }

  const ipfsHash = response.data.IpfsHash;
  const gateway  = process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud";
  const ipfsUrl  = `${gateway}/ipfs/${ipfsHash}`;

  logger.info(`✅ File uploaded to IPFS: ${ipfsHash}`);

  return {
    ipfsHash,
    ipfsUrl,
    sha256Hash,
    fileSize: fileBuffer.length,
  };
};

/**
 * Test the Pinata API connection.
 * Call this at startup to verify credentials are correct.
 */
const testPinataConnection = async () => {
  try {
    const res = await axios.get(`${PINATA_BASE_URL}/data/testAuthentication`, {
      headers: {
        pinata_api_key:        process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    });
    logger.info(`📌 Pinata connected: ${res.data.message}`);
    return true;
  } catch {
    logger.warn("⚠️  Pinata authentication failed. Check PINATA_API_KEY in .env");
    return false;
  }
};

module.exports = { uploadToPinata, testPinataConnection };

