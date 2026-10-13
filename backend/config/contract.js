// config/contract.js
// ============================================================
//  ethers.js Contract Instance — shared across the backend
//
//  This module creates ONE instance of the contract connection.
//  Every other module that needs to read or write on-chain data
//  imports this instead of creating a new connection each time.
//
//  IMPORTANT: The backend uses a "provider" (read-only) for most
//  queries. For write operations (admin actions), it uses a "signer"
//  (wallet with private key). The admin's private key lives in .env
//  and NEVER leaves the server.
// ============================================================

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

let provider;
let adminSigner;
let contract;
let contractReadOnly;

/**
 * Initialize the ethers.js provider and contract instances.
 * Call this once when the server starts (in server.js).
 */
const initContract = () => {
  // ── 1. Provider (read-only connection to the blockchain) ────
  provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  // ── 2. Admin Signer (for sending transactions) ───────────────
  // The private key is loaded from .env — NEVER hardcode it!
  if (process.env.ADMIN_PRIVATE_KEY) {
    adminSigner = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    logger.info(`🔑 Admin signer loaded: ${adminSigner.address}`);
  } else {
    logger.warn("⚠️  ADMIN_PRIVATE_KEY not set. Admin write operations will fail.");
  }

  // ── 3. Load ABI from the file deployed.js copied ─────────────
  const abiPath = path.join(__dirname, "LandRegistry.json");
  if (!fs.existsSync(abiPath)) {
    throw new Error(
      "LandRegistry.json ABI not found in backend/config/. " +
      "Run 'npx hardhat run scripts/deploy.js --network localhost' first."
    );
  }

  const { abi, contractAddress } = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const address = process.env.CONTRACT_ADDRESS || contractAddress;

  // ── 4. Read-only contract (for getLand, getOwnershipHistory, etc.) ──
  contractReadOnly = new ethers.Contract(address, abi, provider);

  // ── 5. Write contract (connected to the admin signer) ────────
  if (adminSigner) {
    contract = new ethers.Contract(address, abi, adminSigner);
  } else {
    contract = contractReadOnly;
  }

  logger.info(`📜 Contract connected at: ${address}`);
  return { provider, contract, contractReadOnly };
};

const getProvider        = () => provider;
const getContract        = () => contract;
const getReadOnlyContract = () => contractReadOnly;
const getAdminSigner     = () => adminSigner;

module.exports = { initContract, getProvider, getContract, getReadOnlyContract, getAdminSigner };

