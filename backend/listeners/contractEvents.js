// listeners/contractEvents.js
// ============================================================
//  Blockchain Event Listener & MongoDB Sync Engine
//
//  Responsibilities:
//    1. Track state transitions on-chain and mirror them into MongoDB.
//    2. Maintain `SyncState` checkpoint to resume safely upon server restart.
//    3. Handle block confirmations to guard against blockchain reorgs.
//    4. Dispatch in-app notifications to buyers, sellers, and registrars.
// ============================================================

const { ethers } = require("ethers");
const Land = require("../models/Land");
const Transfer = require("../models/Transfer");
const SyncState = require("../models/SyncState");
const { sendNotification } = require("../services/notification.service");
const { writeAuditLog } = require("../services/audit.service");
const logger = require("../utils/logger");

class EventListener {
  constructor(contract, provider) {
    this.contract = contract;
    this.provider = provider;
    this.confirmations = Number(process.env.BLOCK_CONFIRMATIONS) || 1;
    this.isSyncing = false;
  }

  /**
   * Start historical sync and attach real-time event listeners.
   */
  async start() {
    try {
      const syncState = await SyncState.getOrCreate(
        Number(process.env.START_BLOCK) || 0
      );
      const currentBlock = await this.provider.getBlockNumber();

      logger.info(`🎧 Starting Event Listener...`);
      logger.info(`   Last Processed Block: ${syncState.lastProcessedBlock}`);
      logger.info(`   Current Head Block:   ${currentBlock}`);

      // 1. Replay historical blocks missed while offline
      await this.catchUpHistoricalEvents(syncState.lastProcessedBlock, currentBlock);

      // 2. Attach continuous listener for new live blocks
      this.subscribeLiveEvents();
    } catch (err) {
      logger.error(`❌ Failed to start Event Listener: ${err.message}`);
    }
  }

  /**
   * Query past events in batches to catch up after server downtime.
   */
  async catchUpHistoricalEvents(fromBlock, toBlock) {
    if (fromBlock >= toBlock) {
      logger.info("✅ Database is up to date with the latest block.");
      return;
    }

    logger.info(`⏳ Catching up missed blocks from ${fromBlock + 1} to ${toBlock}...`);

    const BATCH_SIZE = 1000;
    let start = fromBlock + 1;

    while (start <= toBlock) {
      const end = Math.min(start + BATCH_SIZE - 1, toBlock);
      logger.debug(`Scanning blocks ${start} - ${end}...`);

      try {
        const events = await this.contract.queryFilter("*", start, end);
        for (const event of events) {
          await this.processEvent(event);
        }

        await SyncState.updateBlock(end);
        start = end + 1;
      } catch (error) {
        logger.error(`Error querying events between ${start} and ${end}: ${error.message}`);
        break;
      }
    }

    logger.info("✅ Historical event sync complete.");
  }

  /**
   * Listen for events on live mined blocks.
   */
  subscribeLiveEvents() {
    logger.info("👂 Subscribing to live contract events...");

    // Event 1: LandRegistered
    this.contract.on("LandRegistered", async (landId, owner, surveyNumber, ipfsHash, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onLandRegistered(landId, owner, surveyNumber, ipfsHash, eventPayload)
      );
    });

    // Event 2: LandVerified
    this.contract.on("LandVerified", async (landId, verifiedBy, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onLandVerified(landId, verifiedBy, eventPayload)
      );
    });

    // Event 3: LandRejected
    this.contract.on("LandRejected", async (landId, rejectedBy, reason, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onLandRejected(landId, rejectedBy, reason, eventPayload)
      );
    });

    // Event 4: TransferInitiated
    this.contract.on("TransferInitiated", async (landId, from, to, price, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onTransferInitiated(landId, from, to, price, eventPayload)
      );
    });

    // Event 5: TransferAccepted
    this.contract.on("TransferAccepted", async (landId, buyer, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onTransferAccepted(landId, buyer, eventPayload)
      );
    });

    // Event 6: TransferApproved
    this.contract.on("TransferApproved", async (landId, from, to, price, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onTransferApproved(landId, from, to, price, eventPayload)
      );
    });

    // Event 7: TransferRejected
    this.contract.on("TransferRejected", async (landId, rejectedBy, reason, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onTransferRejected(landId, rejectedBy, reason, eventPayload)
      );
    });

    // Event 8: TransferCancelled
    this.contract.on("TransferCancelled", async (landId, cancelledBy, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onTransferCancelled(landId, cancelledBy, eventPayload)
      );
    });

    // Event 9: LandFrozen
    this.contract.on("LandFrozen", async (landId, frozenBy, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onLandFrozen(landId, frozenBy, eventPayload)
      );
    });

    // Event 10: LandUnfrozen
    this.contract.on("LandUnfrozen", async (landId, unfrozenBy, timestamp, eventPayload) => {
      await this.handleWithConfirmation(eventPayload, () =>
        this.onLandUnfrozen(landId, unfrozenBy, eventPayload)
      );
    });
  }

  /**
   * Block confirmation check before applying database mutations.
   */
  async handleWithConfirmation(eventPayload, handler) {
    try {
      const txReceipt = await eventPayload.getTransactionReceipt();
      if (this.confirmations > 1 && txReceipt) {
        await txReceipt.wait(this.confirmations);
      }

      await handler();

      if (eventPayload.blockNumber) {
        await SyncState.updateBlock(eventPayload.blockNumber);
      }
    } catch (err) {
      logger.error(`Error handling event on block ${eventPayload?.blockNumber}: ${err.message}`);
    }
  }

  /**
   * Generic router for historical events.
   */
  async processEvent(event) {
    const eventName = event.fragment?.name || event.eventName;
    const args = event.args;

    switch (eventName) {
      case "LandRegistered":
        await this.onLandRegistered(args[0], args[1], args[2], args[3], event);
        break;
      case "LandVerified":
        await this.onLandVerified(args[0], args[1], event);
        break;
      case "LandRejected":
        await this.onLandRejected(args[0], args[1], args[2], event);
        break;
      case "TransferInitiated":
        await this.onTransferInitiated(args[0], args[1], args[2], args[3], event);
        break;
      case "TransferAccepted":
        await this.onTransferAccepted(args[0], args[1], event);
        break;
      case "TransferApproved":
        await this.onTransferApproved(args[0], args[1], args[2], args[3], event);
        break;
      case "TransferRejected":
        await this.onTransferRejected(args[0], args[1], args[2], event);
        break;
      case "TransferCancelled":
        await this.onTransferCancelled(args[0], args[1], event);
        break;
      case "LandFrozen":
        await this.onLandFrozen(args[0], args[1], event);
        break;
      case "LandUnfrozen":
        await this.onLandUnfrozen(args[0], args[1], event);
        break;
      default:
        logger.debug(`Unhandled event: ${eventName}`);
    }
  }

  // ============================================================
  //  EVENT HANDLERS
  // ============================================================

  async onLandRegistered(landId, owner, surveyNumber, ipfsHash, event) {
    const numericLandId = Number(landId);
    logger.info(`✨ Event: LandRegistered [ID: ${numericLandId}, Owner: ${owner}]`);

    // Fetch full metadata from contract
    const landOnChain = await this.contract.getLand(landId);

    await Land.findOneAndUpdate(
      { landId: numericLandId },
      {
        landId: numericLandId,
        surveyNumber,
        area: Number(landOnChain.area),
        location: landOnChain.location,
        ownerAddress: owner.toLowerCase(),
        price: landOnChain.price.toString(),
        ipfsHash,
        status: "PENDING",
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      },
      { upsert: true, new: true }
    );

    await sendNotification(
      owner,
      "Land Registration Submitted",
      `Your land parcel #${numericLandId} (${surveyNumber}) has been submitted and is pending registrar review.`,
      "SYSTEM",
      numericLandId,
      `/lands/${numericLandId}`
    );
  }

  async onLandVerified(landId, verifiedBy, event) {
    const numericLandId = Number(landId);
    logger.info(`✅ Event: LandVerified [ID: ${numericLandId}]`);

    const land = await Land.findOneAndUpdate(
      { landId: numericLandId },
      { status: "VERIFIED" },
      { new: true }
    );

    if (land) {
      await sendNotification(
        land.ownerAddress,
        "Land Record Verified",
        `Congratulations! Your land parcel #${numericLandId} has been verified by the registrar.`,
        "LAND_VERIFIED",
        numericLandId,
        `/lands/${numericLandId}`
      );
    }

    await writeAuditLog({
      action: "LAND_VERIFIED",
      performedBy: verifiedBy,
      landId: numericLandId,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  }

  async onLandRejected(landId, rejectedBy, reason, event) {
    const numericLandId = Number(landId);
    logger.info(`🚫 Event: LandRejected [ID: ${numericLandId}, Reason: ${reason}]`);

    const land = await Land.findOneAndUpdate(
      { landId: numericLandId },
      { status: "REJECTED", rejectionReason: reason },
      { new: true }
    );

    if (land) {
      await sendNotification(
        land.ownerAddress,
        "Land Registration Rejected",
        `Land #${numericLandId} was rejected by the registrar. Reason: "${reason}"`,
        "LAND_REJECTED",
        numericLandId,
        `/lands/${numericLandId}`
      );
    }

    await writeAuditLog({
      action: "LAND_REJECTED",
      performedBy: rejectedBy,
      landId: numericLandId,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      metadata: { reason },
    });
  }

  async onTransferInitiated(landId, from, to, price, event) {
    const numericLandId = Number(landId);
    logger.info(`🔄 Event: TransferInitiated [ID: ${numericLandId}, From: ${from} -> To: ${to}]`);

    await Transfer.create({
      landId: numericLandId,
      fromAddress: from.toLowerCase(),
      toAddress: to.toLowerCase(),
      price: price.toString(),
      state: "INITIATED",
      initiatedTxHash: event.transactionHash,
      initiatedBlock: event.blockNumber,
      initiatedAt: new Date(),
    });

    // Alert Buyer
    await sendNotification(
      to,
      "New Transfer Request",
      `Owner ${from.slice(0, 6)}... has initiated an ownership transfer for Land #${numericLandId}. Please review and accept.`,
      "TRANSFER_INITIATED",
      numericLandId,
      `/buyer`
    );
  }

  async onTransferAccepted(landId, buyer, event) {
    const numericLandId = Number(landId);
    logger.info(`🤝 Event: TransferAccepted [ID: ${numericLandId}, Buyer: ${buyer}]`);

    const transfer = await Transfer.findOneAndUpdate(
      { landId: numericLandId, state: "INITIATED" },
      {
        state: "BUYER_ACCEPTED",
        acceptedTxHash: event.transactionHash,
        buyerAcceptedAt: new Date(),
      },
      { new: true }
    );

    if (transfer) {
      // Alert Seller
      await sendNotification(
        transfer.fromAddress,
        "Buyer Accepted Transfer",
        `Buyer ${buyer.slice(0, 6)}... has accepted the transfer for Land #${numericLandId}. Awaiting registrar approval.`,
        "TRANSFER_ACCEPTED",
        numericLandId,
        `/transfers/${numericLandId}`
      );
    }
  }

  async onTransferApproved(landId, from, to, price, event) {
    const numericLandId = Number(landId);
    logger.info(`🎉 Event: TransferApproved [ID: ${numericLandId}]`);

    // 1. Update Land record owner
    await Land.findOneAndUpdate(
      { landId: numericLandId },
      { ownerAddress: to.toLowerCase() }
    );

    // 2. Mark Transfer Approved
    await Transfer.findOneAndUpdate(
      { landId: numericLandId, state: "BUYER_ACCEPTED" },
      {
        state: "APPROVED",
        approvedTxHash: event.transactionHash,
        approvedBlock: event.blockNumber,
        approvedAt: new Date(),
      }
    );

    // 3. Notify Both Parties
    await sendNotification(
      from,
      "Ownership Transfer Finalized",
      `Transfer of Land #${numericLandId} has been approved by the registrar. Ownership is now transferred.`,
      "TRANSFER_APPROVED",
      numericLandId,
      `/lands/${numericLandId}`
    );

    await sendNotification(
      to,
      "You are the New Owner!",
      `Registrar has approved your transfer for Land #${numericLandId}. You are now the official title holder.`,
      "TRANSFER_APPROVED",
      numericLandId,
      `/lands/${numericLandId}`
    );
  }

  async onTransferRejected(landId, rejectedBy, reason, event) {
    const numericLandId = Number(landId);
    logger.info(`❌ Event: TransferRejected [ID: ${numericLandId}]`);

    const transfer = await Transfer.findOneAndUpdate(
      { landId: numericLandId, state: { $in: ["INITIATED", "BUYER_ACCEPTED"] } },
      {
        state: "REJECTED",
        rejectionReason: reason,
        rejectedTxHash: event.transactionHash,
        rejectedAt: new Date(),
      },
      { new: true }
    );

    if (transfer) {
      await sendNotification(
        [transfer.fromAddress, transfer.toAddress],
        "Transfer Request Rejected",
        `Transfer for Land #${numericLandId} was rejected by registrar: "${reason}"`,
        "TRANSFER_REJECTED",
        numericLandId,
        `/transfers/${numericLandId}`
      );
    }

    await writeAuditLog({
      action: "TRANSFER_REJECTED",
      performedBy: rejectedBy,
      landId: numericLandId,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      metadata: { reason },
    });
  }

  async onTransferCancelled(landId, cancelledBy, event) {
    const numericLandId = Number(landId);
    logger.info(`⏹️ Event: TransferCancelled [ID: ${numericLandId}]`);

    const transfer = await Transfer.findOneAndUpdate(
      { landId: numericLandId, state: "INITIATED" },
      {
        state: "CANCELLED",
        cancelledTxHash: event.transactionHash,
        cancelledAt: new Date(),
      },
      { new: true }
    );

    if (transfer) {
      await sendNotification(
        transfer.toAddress,
        "Transfer Offer Cancelled",
        `Seller cancelled the pending transfer for Land #${numericLandId}.`,
        "TRANSFER_CANCELLED",
        numericLandId,
        `/buyer`
      );
    }
  }

  async onLandFrozen(landId, frozenBy, event) {
    const numericLandId = Number(landId);
    logger.warn(`❄️ Event: LandFrozen [ID: ${numericLandId}]`);

    const land = await Land.findOneAndUpdate(
      { landId: numericLandId },
      { status: "FROZEN" },
      { new: true }
    );

    if (land) {
      await sendNotification(
        land.ownerAddress,
        "Land Record Frozen",
        `Land #${numericLandId} has been frozen by the registrar due to a dispute or investigation. Transfers are halted.`,
        "LAND_FROZEN",
        numericLandId,
        `/lands/${numericLandId}`
      );
    }

    await writeAuditLog({
      action: "LAND_FROZEN",
      performedBy: frozenBy,
      landId: numericLandId,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  }

  async onLandUnfrozen(landId, unfrozenBy, event) {
    const numericLandId = Number(landId);
    logger.info(`☀️ Event: LandUnfrozen [ID: ${numericLandId}]`);

    const land = await Land.findOneAndUpdate(
      { landId: numericLandId },
      { status: "VERIFIED" },
      { new: true }
    );

    if (land) {
      await sendNotification(
        land.ownerAddress,
        "Land Status Restored",
        `The freeze on Land #${numericLandId} has been lifted. The parcel is now active and verified.`,
        "SYSTEM",
        numericLandId,
        `/lands/${numericLandId}`
      );
    }

    await writeAuditLog({
      action: "LAND_UNFROZEN",
      performedBy: unfrozenBy,
      landId: numericLandId,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
    });
  }
}

module.exports = EventListener;

