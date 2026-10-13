// scripts/setup-roles.js
// ============================================================
//  Run AFTER deploying to assign REGISTRAR_ROLE to admin wallets.
//
//  Usage:
//    npx hardhat run scripts/setup-roles.js --network localhost
//
//  Edit the REGISTRAR_ADDRESSES array below to add your admin wallets.
// ============================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ✏️  Add wallet addresses that should be registrars (government officials)
// On localhost, Hardhat gives you 20 test addresses — use index [1] as admin
const REGISTRAR_ADDRESSES = [
  // "0xYourAdminWalletAddress1Here",
  // "0xYourAdminWalletAddress2Here",
];

async function main() {
  console.log("\n========================================");
  console.log("  Setting Up Registrar Roles...");
  console.log("========================================\n");

  // Load deployment info to find the contract address
  const networkName = (await ethers.provider.getNetwork()).name === "unknown"
    ? "localhost"
    : (await ethers.provider.getNetwork()).name;

  const deploymentPath = path.join(
    __dirname,
    `../deployments/${networkName}.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `No deployment found for network '${networkName}'. Run deploy.js first.`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  console.log("Contract address:", deployment.contractAddress);

  // Connect to the deployed contract
  const LandRegistry = await ethers.getContractFactory("LandRegistry");
  const landRegistry = LandRegistry.attach(deployment.contractAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Calling as     :", deployer.address, "(must be DEFAULT_ADMIN_ROLE)\n");

  if (REGISTRAR_ADDRESSES.length === 0) {
    // On localhost, auto-use the second Hardhat test account as a registrar
    const accounts = await ethers.getSigners();
    if (accounts.length > 1) {
      REGISTRAR_ADDRESSES.push(accounts[1].address);
      console.log("ℹ️  No addresses configured. Using Hardhat account[1] as registrar:");
      console.log("   ", accounts[1].address);
    }
  }

  for (const address of REGISTRAR_ADDRESSES) {
    console.log(`Granting REGISTRAR_ROLE to ${address}...`);
    const tx = await landRegistry.grantRegistrarRole(address);
    await tx.wait();
    console.log(`✅ Done! TX: ${tx.hash}`);
  }

  console.log("\n✅ All registrar roles assigned successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  });

