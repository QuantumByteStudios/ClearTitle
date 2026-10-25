// test/LandRegistry.test.js
// ============================================================
//  Hardhat + Chai Test Suite for LandRegistry.sol
//
//  Run with:
//    npx hardhat test
//    npx hardhat test --grep "Land Registration"   ← run one section
//    npx hardhat coverage                           ← code coverage report
//
//  How tests work:
//    describe() = a group of related tests (like a chapter)
//    it()       = a single test (like a sentence: "it should ...")
//    expect()   = an assertion — if it fails, the test fails
//    beforeEach() = runs BEFORE every single test (fresh state)
// ============================================================

const { expect } = require("chai");
const { ethers } = require("hardhat");

// ============================================================
//  HELPERS — reusable values to avoid typing the same thing
// ============================================================

// These match the enum order in LandRegistry.sol:
const LandStatus = {
  PENDING:  0,
  VERIFIED: 1,
  REJECTED: 2,
  DISPUTED: 3,
  FROZEN:   4,
};

const TransferState = {
  NONE:           0,
  INITIATED:      1,
  BUYER_ACCEPTED: 2,
  APPROVED:       3,
  REJECTED:       4,
  CANCELLED:      5,
};

// Default valid land registration data
const SAMPLE_LAND = {
  surveyNumber: "SN-KA-2024-001",
  area:         500n,                          // 500 sq meters (BigInt)
  location:     "Plot 42, MG Road, Bengaluru",
  price:        ethers.parseEther("1.5"),      // 1.5 ETH in Wei
  ipfsHash:     "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
};

// ============================================================
//  MAIN TEST SUITE
// ============================================================

describe("LandRegistry Contract", function () {
  // Increase timeout for slow operations (like deploying)
  this.timeout(60_000);

  // ── Shared variables ──────────────────────────────────────
  let landRegistry;   // the deployed contract instance
  let admin;          // account[0] — has DEFAULT_ADMIN_ROLE + REGISTRAR_ROLE
  let registrar;      // account[1] — will be granted REGISTRAR_ROLE
  let seller;         // account[2] — land owner
  let buyer;          // account[3] — buyer
  let stranger;       // account[4] — no role, for negative tests

  // ── beforeEach: fresh contract before every test ──────────
  // This is crucial — each test runs on a clean contract so they
  // don't interfere with each other.
  beforeEach(async function () {
    [admin, registrar, seller, buyer, stranger] = await ethers.getSigners();

    const LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy(admin.address);
    await landRegistry.waitForDeployment();

    // Grant REGISTRAR_ROLE to the registrar account
    await landRegistry.connect(admin).grantRegistrarRole(registrar.address);
  });

  // ===========================================================
  //  1. DEPLOYMENT
  // ===========================================================

  describe("Deployment", function () {
    it("should set the deployer as DEFAULT_ADMIN_ROLE", async function () {
      const ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
      expect(await landRegistry.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should set the deployer as REGISTRAR_ROLE", async function () {
      const REGISTRAR_ROLE = await landRegistry.REGISTRAR_ROLE();
      expect(await landRegistry.hasRole(REGISTRAR_ROLE, admin.address)).to.be.true;
    });

    it("should start with totalLands = 0", async function () {
      expect(await landRegistry.totalLands()).to.equal(0n);
    });

    it("should NOT be paused on deployment", async function () {
      expect(await landRegistry.paused()).to.be.false;
    });

    it("should revert if deployed with zero address as admin", async function () {
      const LandRegistry = await ethers.getContractFactory("LandRegistry");
      await expect(
        LandRegistry.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(landRegistry, "ZeroAddress");
    });
  });

  // ===========================================================
  //  2. ROLE MANAGEMENT
  // ===========================================================

  describe("Role Management", function () {
    it("should allow admin to grant REGISTRAR_ROLE", async function () {
      const REGISTRAR_ROLE = await landRegistry.REGISTRAR_ROLE();
      expect(await landRegistry.hasRole(REGISTRAR_ROLE, registrar.address)).to.be.true;
    });

    it("should allow admin to revoke REGISTRAR_ROLE", async function () {
      await landRegistry.connect(admin).revokeRegistrarRole(registrar.address);
      const REGISTRAR_ROLE = await landRegistry.REGISTRAR_ROLE();
      expect(await landRegistry.hasRole(REGISTRAR_ROLE, registrar.address)).to.be.false;
    });

    it("should revert if non-admin tries to grant REGISTRAR_ROLE", async function () {
      await expect(
        landRegistry.connect(stranger).grantRegistrarRole(buyer.address)
      ).to.be.reverted;
      // We check it.reverted broadly because AccessControl generates
      // its own error message. You could also use .revertedWith(...)
    });

    it("should revert if granting REGISTRAR_ROLE to zero address", async function () {
      await expect(
        landRegistry.connect(admin).grantRegistrarRole(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(landRegistry, "ZeroAddress");
    });
  });

  // ===========================================================
  //  3. LAND REGISTRATION — Happy Path
  // ===========================================================

  describe("Land Registration", function () {
    it("✅ should register a land successfully", async function () {
      const tx = await landRegistry
        .connect(seller)
        .registerLand(
          SAMPLE_LAND.surveyNumber,
          SAMPLE_LAND.area,
          SAMPLE_LAND.location,
          SAMPLE_LAND.price,
          SAMPLE_LAND.ipfsHash
        );

      await tx.wait();

      // Read the land back from the contract
      const land = await landRegistry.getLand(1n);

      // Verify all fields were stored correctly
      expect(land.landId).to.equal(1n);
      expect(land.surveyNumber).to.equal(SAMPLE_LAND.surveyNumber);
      expect(land.area).to.equal(SAMPLE_LAND.area);
      expect(land.location).to.equal(SAMPLE_LAND.location);
      expect(land.currentOwner).to.equal(seller.address);
      expect(land.price).to.equal(SAMPLE_LAND.price);
      expect(land.ipfsHash).to.equal(SAMPLE_LAND.ipfsHash);
      expect(land.status).to.equal(LandStatus.PENDING);
      expect(land.exists).to.be.true;
    });

    it("✅ should increment landId for each new registration", async function () {
      await landRegistry.connect(seller).registerLand(
        "SN-001", 100n, "Location A", ethers.parseEther("1"), "QmHash1"
      );
      await landRegistry.connect(seller).registerLand(
        "SN-002", 200n, "Location B", ethers.parseEther("2"), "QmHash2"
      );

      expect(await landRegistry.totalLands()).to.equal(2n);

      const land1 = await landRegistry.getLand(1n);
      const land2 = await landRegistry.getLand(2n);
      expect(land1.landId).to.equal(1n);
      expect(land2.landId).to.equal(2n);
    });

    it("✅ should emit LandRegistered event with correct args", async function () {
      await expect(
        landRegistry.connect(seller).registerLand(
          SAMPLE_LAND.surveyNumber,
          SAMPLE_LAND.area,
          SAMPLE_LAND.location,
          SAMPLE_LAND.price,
          SAMPLE_LAND.ipfsHash
        )
      )
        .to.emit(landRegistry, "LandRegistered")
        .withArgs(
          1n,                   // landId
          seller.address,       // owner
          SAMPLE_LAND.surveyNumber,
          SAMPLE_LAND.ipfsHash,
          (timestamp) => timestamp > 0n  // any positive timestamp is valid
        );
    });

    it("✅ should add land to owner's land list", async function () {
      await landRegistry.connect(seller).registerLand(
        "SN-001", 500n, "Location A", ethers.parseEther("1"), "QmHash1"
      );
      await landRegistry.connect(seller).registerLand(
        "SN-002", 300n, "Location B", ethers.parseEther("2"), "QmHash2"
      );

      const sellerLands = await landRegistry.getLandsByOwner(seller.address);
      expect(sellerLands).to.have.length(2);
      expect(sellerLands[0]).to.equal(1n);
      expect(sellerLands[1]).to.equal(2n);
    });

    it("✅ should record the first history entry", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );

      const history = await landRegistry.getOwnershipHistory(1n);
      expect(history).to.have.length(1);
      expect(history[0].owner).to.equal(seller.address);
      expect(history[0].transactionType).to.equal("REGISTERED");
    });

    it("✅ should allow lookup by survey number", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );

      const foundId = await landRegistry.getLandIdBySurveyNumber(SAMPLE_LAND.surveyNumber);
      expect(foundId).to.equal(1n);
    });

    // ── Failure Cases ────────────────────────────────────────
    it("❌ should revert if survey number is empty", async function () {
      await expect(
        landRegistry.connect(seller).registerLand(
          "", SAMPLE_LAND.area, SAMPLE_LAND.location,
          SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
        )
      ).to.be.revertedWithCustomError(landRegistry, "EmptyString");
    });

    it("❌ should revert if area is 0", async function () {
      await expect(
        landRegistry.connect(seller).registerLand(
          SAMPLE_LAND.surveyNumber, 0n, SAMPLE_LAND.location,
          SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
        )
      ).to.be.revertedWithCustomError(landRegistry, "InvalidArea");
    });

    it("❌ should revert if price is 0", async function () {
      await expect(
        landRegistry.connect(seller).registerLand(
          SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
          0n, SAMPLE_LAND.ipfsHash
        )
      ).to.be.revertedWithCustomError(landRegistry, "InvalidPrice");
    });

    it("❌ should revert if IPFS hash is empty", async function () {
      await expect(
        landRegistry.connect(seller).registerLand(
          SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
          SAMPLE_LAND.price, ""
        )
      ).to.be.revertedWithCustomError(landRegistry, "EmptyString");
    });

    it("❌ should revert if survey number already registered", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );

      await expect(
        landRegistry.connect(buyer).registerLand(
          SAMPLE_LAND.surveyNumber, 300n, "Other Location",
          ethers.parseEther("2"), "QmOtherHash"
        )
      ).to.be.revertedWithCustomError(landRegistry, "SurveyNumberAlreadyRegistered");
    });

    it("❌ should revert if contract is paused", async function () {
      await landRegistry.connect(admin).pause();

      await expect(
        landRegistry.connect(seller).registerLand(
          SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
          SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
        )
      ).to.be.revertedWithCustomError(landRegistry, "EnforcedPause");
    });
  });

  // ===========================================================
  //  4. LAND VERIFICATION — Happy Path & Failures
  // ===========================================================

  describe("Land Verification", function () {
    // Register a land before each test in this block
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
    });

    it("✅ should allow registrar to verify a PENDING land", async function () {
      await landRegistry.connect(registrar).verifyLand(1n);
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.VERIFIED);
    });

    it("✅ should emit LandVerified event", async function () {
      await expect(landRegistry.connect(registrar).verifyLand(1n))
        .to.emit(landRegistry, "LandVerified")
        .withArgs(1n, registrar.address, (ts) => ts > 0n);
    });

    it("✅ should add VERIFIED entry to history", async function () {
      await landRegistry.connect(registrar).verifyLand(1n);
      const history = await landRegistry.getOwnershipHistory(1n);
      expect(history).to.have.length(2); // REGISTERED + VERIFIED
      expect(history[1].transactionType).to.equal("VERIFIED");
    });

    it("✅ should allow admin to also verify (has REGISTRAR_ROLE)", async function () {
      await landRegistry.connect(admin).verifyLand(1n);
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.VERIFIED);
    });

    it("❌ should revert if stranger tries to verify", async function () {
      await expect(
        landRegistry.connect(stranger).verifyLand(1n)
      ).to.be.reverted;
    });

    it("❌ should revert if land does not exist", async function () {
      await expect(
        landRegistry.connect(registrar).verifyLand(999n)
      ).to.be.revertedWithCustomError(landRegistry, "LandDoesNotExist");
    });

    it("❌ should revert if land is already verified", async function () {
      await landRegistry.connect(registrar).verifyLand(1n);
      await expect(
        landRegistry.connect(registrar).verifyLand(1n)
      ).to.be.revertedWith("LandRegistry: land is not in PENDING status");
    });

    it("❌ should revert if land is REJECTED (not PENDING)", async function () {
      await landRegistry.connect(registrar).rejectLand(1n, "Bad documents");
      await expect(
        landRegistry.connect(registrar).verifyLand(1n)
      ).to.be.revertedWith("LandRegistry: land is not in PENDING status");
    });
  });

  // ===========================================================
  //  5. LAND REJECTION
  // ===========================================================

  describe("Land Rejection", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
    });

    it("✅ should allow registrar to reject a PENDING land", async function () {
      await landRegistry.connect(registrar).rejectLand(1n, "Documents are forged");
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.REJECTED);
    });

    it("✅ should emit LandRejected event with reason", async function () {
      const reason = "Survey number mismatch";
      await expect(landRegistry.connect(registrar).rejectLand(1n, reason))
        .to.emit(landRegistry, "LandRejected")
        .withArgs(1n, registrar.address, reason, (ts) => ts > 0n);
    });

    it("❌ should revert if reason is empty", async function () {
      await expect(
        landRegistry.connect(registrar).rejectLand(1n, "")
      ).to.be.revertedWithCustomError(landRegistry, "EmptyString");
    });

    it("❌ should revert if non-registrar tries to reject", async function () {
      await expect(
        landRegistry.connect(seller).rejectLand(1n, "Some reason")
      ).to.be.reverted;
    });

    it("✅ should free the survey number so it can be registered again", async function () {
      await landRegistry.connect(registrar).rejectLand(1n, "Documents are forged");
      expect(
        await landRegistry.getLandIdBySurveyNumber(SAMPLE_LAND.surveyNumber)
      ).to.equal(0n);

      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );

      const land = await landRegistry.getLand(2n);
      expect(land.surveyNumber).to.equal(SAMPLE_LAND.surveyNumber);
      expect(land.status).to.equal(LandStatus.PENDING);
      expect(
        await landRegistry.getLandIdBySurveyNumber(SAMPLE_LAND.surveyNumber)
      ).to.equal(2n);
    });
  });

  // ===========================================================
  //  6. FREEZE / UNFREEZE
  // ===========================================================

  describe("Freeze and Unfreeze", function () {
    beforeEach(async function () {
      // Register and verify land
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
    });

    it("✅ should freeze a VERIFIED land", async function () {
      await landRegistry.connect(registrar).freezeLand(1n);
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.FROZEN);
    });

    it("✅ should emit LandFrozen event", async function () {
      await expect(landRegistry.connect(registrar).freezeLand(1n))
        .to.emit(landRegistry, "LandFrozen")
        .withArgs(1n, registrar.address, (ts) => ts > 0n);
    });

    it("✅ should unfreeze a FROZEN land back to VERIFIED", async function () {
      await landRegistry.connect(registrar).freezeLand(1n);
      await landRegistry.connect(registrar).unfreezeLand(1n);
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.VERIFIED);
    });

    it("✅ should emit LandUnfrozen event", async function () {
      await landRegistry.connect(registrar).freezeLand(1n);
      await expect(landRegistry.connect(registrar).unfreezeLand(1n))
        .to.emit(landRegistry, "LandUnfrozen")
        .withArgs(1n, registrar.address, (ts) => ts > 0n);
    });

    it("❌ should revert freezing a PENDING land", async function () {
      // Register a second land (still PENDING)
      await landRegistry.connect(seller).registerLand(
        "SN-002", 300n, "Location B", ethers.parseEther("1"), "QmHash2"
      );
      await expect(
        landRegistry.connect(registrar).freezeLand(2n)
      ).to.be.revertedWith("LandRegistry: only VERIFIED lands can be frozen");
    });

    it("❌ should revert unfreezing a non-frozen land", async function () {
      await expect(
        landRegistry.connect(registrar).unfreezeLand(1n)
      ).to.be.revertedWith("LandRegistry: land is not FROZEN");
    });

    it("❌ should block transfer of FROZEN land", async function () {
      await landRegistry.connect(registrar).freezeLand(1n);
      await expect(
        landRegistry
          .connect(seller)
          .initiateTransfer(1n, buyer.address, ethers.parseEther("2"))
      ).to.be.revertedWithCustomError(landRegistry, "LandIsFrozen");
    });

    it("❌ cannot accept a transfer after the land is frozen", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(registrar).freezeLand(1n);

      await expect(
        landRegistry.connect(buyer).acceptTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "LandIsFrozen");
    });

    it("❌ cannot approve a transfer the buyer already accepted if the land is then frozen", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).freezeLand(1n);

      await expect(
        landRegistry.connect(registrar).approveTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "LandIsFrozen");
    });
  });

  // ===========================================================
  //  7. FULL TRANSFER FLOW — Happy Path
  //     seller → initiateTransfer → buyer accepts → registrar approves
  // ===========================================================

  describe("Ownership Transfer — Full Happy Path", function () {
    // Set up: register, verify, and have a land ready to transfer
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
    });

    it("✅ should complete full transfer flow: initiate → accept → approve", async function () {
      const salePrice = ethers.parseEther("2.0");

      // Step 1: Seller initiates transfer
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, salePrice);

      let request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.INITIATED);
      expect(request.from).to.equal(seller.address);
      expect(request.to).to.equal(buyer.address);
      expect(request.price).to.equal(salePrice);

      // Step 2: Buyer accepts
      await landRegistry.connect(buyer).acceptTransfer(1n);

      request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.BUYER_ACCEPTED);

      // Step 3: Registrar approves
      await landRegistry.connect(registrar).approveTransfer(1n);

      request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.APPROVED);

      // Verify ownership changed on-chain
      const land = await landRegistry.getLand(1n);
      expect(land.currentOwner).to.equal(buyer.address);

      // Seller's list should be empty now
      const sellerLands = await landRegistry.getLandsByOwner(seller.address);
      expect(sellerLands).to.have.length(0);

      // Buyer's list should have the land
      const buyerLands = await landRegistry.getLandsByOwner(buyer.address);
      expect(buyerLands).to.have.length(1);
      expect(buyerLands[0]).to.equal(1n);
    });

    it("✅ should emit TransferInitiated event", async function () {
      const salePrice = ethers.parseEther("2.0");
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, buyer.address, salePrice)
      )
        .to.emit(landRegistry, "TransferInitiated")
        .withArgs(1n, seller.address, buyer.address, salePrice, (ts) => ts > 0n);
    });

    it("✅ should emit TransferAccepted event", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await expect(landRegistry.connect(buyer).acceptTransfer(1n))
        .to.emit(landRegistry, "TransferAccepted")
        .withArgs(1n, buyer.address, (ts) => ts > 0n);
    });

    it("✅ should emit TransferApproved event", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await expect(landRegistry.connect(registrar).approveTransfer(1n))
        .to.emit(landRegistry, "TransferApproved")
        .withArgs(1n, seller.address, buyer.address, SAMPLE_LAND.price, (ts) => ts > 0n);
    });

    it("✅ should record TRANSFER in ownership history", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).approveTransfer(1n);

      const history = await landRegistry.getOwnershipHistory(1n);
      // history: [REGISTERED, VERIFIED, TRANSFER] = 3 entries
      expect(history).to.have.length(3);
      expect(history[2].owner).to.equal(buyer.address);
      expect(history[2].transactionType).to.equal("TRANSFER");
    });

    it("✅ new owner can initiate another transfer after receiving", async function () {
      // Complete first transfer: seller → buyer
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).approveTransfer(1n);

      // Buyer is now the owner; they can initiate another transfer to stranger
      await expect(
        landRegistry.connect(buyer).initiateTransfer(1n, stranger.address, ethers.parseEther("3"))
      ).to.emit(landRegistry, "TransferInitiated");
    });
  });

  // ===========================================================
  //  8. TRANSFER — Failure Cases
  // ===========================================================

  describe("Ownership Transfer — Failure Cases", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
    });

    it("❌ should revert if non-owner initiates transfer", async function () {
      await expect(
        landRegistry.connect(stranger).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "NotLandOwner");
    });

    it("❌ should revert if land is not VERIFIED", async function () {
      // Register a second land (still PENDING)
      await landRegistry.connect(seller).registerLand(
        "SN-PENDING", 200n, "Some Place", ethers.parseEther("1"), "QmHash2"
      );
      await expect(
        landRegistry.connect(seller).initiateTransfer(2n, buyer.address, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "LandNotVerified");
    });

    it("❌ should revert if buyer is the zero address", async function () {
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, ethers.ZeroAddress, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "ZeroAddress");
    });

    it("❌ should revert if seller tries to transfer to themselves", async function () {
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, seller.address, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "CannotTransferToSelf");
    });

    it("❌ should revert if price is 0", async function () {
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, buyer.address, 0n)
      ).to.be.revertedWithCustomError(landRegistry, "InvalidPrice");
    });

    it("❌ should revert if a second transfer is initiated while one is active", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      // Try to initiate a second one before the first completes
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, stranger.address, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "ActiveTransferExists");
    });

    it("❌ should revert if wrong person tries to acceptTransfer", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await expect(
        landRegistry.connect(stranger).acceptTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "NotTransferBuyer");
    });

    it("❌ should revert if registrar approves before buyer accepts", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      // Skip acceptTransfer — registrar tries to approve directly
      await expect(
        landRegistry.connect(registrar).approveTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "TransferNotInState");
    });

    it("❌ should revert if non-registrar tries to approveTransfer", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await expect(
        landRegistry.connect(stranger).approveTransfer(1n)
      ).to.be.reverted;
    });
  });

  // ===========================================================
  //  9. CANCEL TRANSFER
  // ===========================================================

  describe("Cancel Transfer", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
    });

    it("✅ seller can cancel a INITIATED transfer", async function () {
      await landRegistry.connect(seller).cancelTransfer(1n);
      const request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.CANCELLED);
    });

    it("✅ should emit TransferCancelled event", async function () {
      await expect(landRegistry.connect(seller).cancelTransfer(1n))
        .to.emit(landRegistry, "TransferCancelled")
        .withArgs(1n, seller.address, (ts) => ts > 0n);
    });

    it("✅ seller can start a new transfer after cancelling", async function () {
      await landRegistry.connect(seller).cancelTransfer(1n);
      // Now try again with a different buyer
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, stranger.address, SAMPLE_LAND.price)
      ).to.emit(landRegistry, "TransferInitiated");
    });

    it("❌ seller cannot cancel after buyer has accepted", async function () {
      await landRegistry.connect(buyer).acceptTransfer(1n);
      // Transfer state is now BUYER_ACCEPTED, not INITIATED
      await expect(
        landRegistry.connect(seller).cancelTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "TransferNotInState");
    });

    it("❌ buyer cannot cancel (only owner can)", async function () {
      await expect(
        landRegistry.connect(buyer).cancelTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "NotLandOwner");
    });
  });

  // ===========================================================
  //  10. REJECT TRANSFER
  // ===========================================================

  describe("Reject Transfer", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
    });

    it("✅ registrar can reject at INITIATED stage", async function () {
      await landRegistry.connect(registrar).rejectTransfer(1n, "Buyer is blacklisted");
      const request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.REJECTED);
    });

    it("✅ registrar can reject at BUYER_ACCEPTED stage", async function () {
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).rejectTransfer(1n, "Legal hold placed");
      const request = await landRegistry.getTransferRequest(1n);
      expect(request.state).to.equal(TransferState.REJECTED);
    });

    it("✅ should emit TransferRejected event", async function () {
      const reason = "Buyer KYC failed";
      await expect(landRegistry.connect(registrar).rejectTransfer(1n, reason))
        .to.emit(landRegistry, "TransferRejected")
        .withArgs(1n, registrar.address, reason, (ts) => ts > 0n);
    });

    it("❌ should revert if reason is empty", async function () {
      await expect(
        landRegistry.connect(registrar).rejectTransfer(1n, "")
      ).to.be.revertedWithCustomError(landRegistry, "EmptyString");
    });

    it("❌ land ownership should NOT change after transfer rejection", async function () {
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).rejectTransfer(1n, "Rejected");

      const land = await landRegistry.getLand(1n);
      // Original seller still owns it
      expect(land.currentOwner).to.equal(seller.address);
    });
  });

  // ===========================================================
  //  11. MARK DISPUTED
  // ===========================================================

  describe("Mark Disputed", function () {
    beforeEach(async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
    });

    it("✅ registrar can mark a VERIFIED land as disputed", async function () {
      await landRegistry.connect(registrar).markDisputed(1n);
      const land = await landRegistry.getLand(1n);
      expect(land.status).to.equal(LandStatus.DISPUTED);
    });

    it("❌ cannot initiate transfer on a DISPUTED land", async function () {
      await landRegistry.connect(registrar).markDisputed(1n);
      await expect(
        landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price)
      ).to.be.revertedWithCustomError(landRegistry, "LandIsDisputed");
    });

    it("❌ cannot accept a transfer after the land is disputed", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(registrar).markDisputed(1n);

      await expect(
        landRegistry.connect(buyer).acceptTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "LandIsDisputed");
    });

    it("❌ cannot approve a transfer the buyer already accepted if the land is then disputed", async function () {
      await landRegistry.connect(seller).initiateTransfer(1n, buyer.address, SAMPLE_LAND.price);
      await landRegistry.connect(buyer).acceptTransfer(1n);
      await landRegistry.connect(registrar).markDisputed(1n);

      await expect(
        landRegistry.connect(registrar).approveTransfer(1n)
      ).to.be.revertedWithCustomError(landRegistry, "LandIsDisputed");
    });
  });

  // ===========================================================
  //  12. PAUSABLE — Emergency Stop
  // ===========================================================

  describe("Pausable Emergency Stop", function () {
    it("✅ admin can pause the contract", async function () {
      await landRegistry.connect(admin).pause();
      expect(await landRegistry.paused()).to.be.true;
    });

    it("✅ admin can unpause the contract", async function () {
      await landRegistry.connect(admin).pause();
      await landRegistry.connect(admin).unpause();
      expect(await landRegistry.paused()).to.be.false;
    });

    it("❌ non-admin cannot pause", async function () {
      await expect(
        landRegistry.connect(stranger).pause()
      ).to.be.reverted;
    });

    it("❌ all state-changing functions revert when paused", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );

      await landRegistry.connect(admin).pause();

      // Registration should fail
      await expect(
        landRegistry.connect(seller).registerLand(
          "SN-NEW", 100n, "New Location", ethers.parseEther("1"), "QmNewHash"
        )
      ).to.be.revertedWithCustomError(landRegistry, "EnforcedPause");

      // Verification should fail
      await expect(
        landRegistry.connect(registrar).verifyLand(1n)
      ).to.be.revertedWithCustomError(landRegistry, "EnforcedPause");
    });

    it("✅ view functions still work while paused", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(admin).pause();

      // Reading land data should still work (it's free, view only)
      const land = await landRegistry.getLand(1n);
      expect(land.landId).to.equal(1n);
    });
  });

  // ===========================================================
  //  13. VIEW FUNCTIONS
  // ===========================================================

  describe("View Functions", function () {
    it("✅ getLand should revert for non-existent land", async function () {
      await expect(
        landRegistry.getLand(999n)
      ).to.be.revertedWithCustomError(landRegistry, "LandDoesNotExist");
    });

    it("✅ getLandsByOwner returns empty array for new address", async function () {
      const lands = await landRegistry.getLandsByOwner(stranger.address);
      expect(lands).to.have.length(0);
    });

    it("✅ getOwnershipHistory grows with each action", async function () {
      await landRegistry.connect(seller).registerLand(
        SAMPLE_LAND.surveyNumber, SAMPLE_LAND.area, SAMPLE_LAND.location,
        SAMPLE_LAND.price, SAMPLE_LAND.ipfsHash
      );
      await landRegistry.connect(registrar).verifyLand(1n);
      await landRegistry.connect(registrar).freezeLand(1n);
      await landRegistry.connect(registrar).unfreezeLand(1n);

      const history = await landRegistry.getOwnershipHistory(1n);
      // REGISTERED, VERIFIED, FROZEN, UNFROZEN = 4 entries
      expect(history).to.have.length(4);
    });

    it("✅ getLandIdBySurveyNumber returns 0 for unknown survey", async function () {
      const id = await landRegistry.getLandIdBySurveyNumber("UNKNOWN");
      expect(id).to.equal(0n);
    });

    it("✅ totalLands increments correctly", async function () {
      expect(await landRegistry.totalLands()).to.equal(0n);

      await landRegistry.connect(seller).registerLand(
        "SN-001", 100n, "A", ethers.parseEther("1"), "QmH1"
      );
      expect(await landRegistry.totalLands()).to.equal(1n);

      await landRegistry.connect(seller).registerLand(
        "SN-002", 200n, "B", ethers.parseEther("2"), "QmH2"
      );
      expect(await landRegistry.totalLands()).to.equal(2n);
    });
  });
});

