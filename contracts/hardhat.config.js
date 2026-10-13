require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Helper: validate if a private key string is a valid 32-byte hex string (64 or 66 chars with 0x)
function getValidAccounts(key) {
  if (!key) return [];
  const cleanKey = key.startsWith("0x") ? key.slice(2) : key;
  if (cleanKey.length === 64 && /^[0-9a-fA-F]+$/.test(cleanKey)) {
    return [key.startsWith("0x") ? key : `0x${key}`];
  }
  return [];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Local Hardhat node — default for development
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Sepolia testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: getValidAccounts(process.env.DEPLOYER_PRIVATE_KEY),
      chainId: 11155111,
    },

    // Polygon Amoy testnet
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: getValidAccounts(process.env.DEPLOYER_PRIVATE_KEY),
      chainId: 80002,
    },
  },

  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
