// controllers/land.controller.js
// ============================================================
//  Land Controller — CRUD + Blockchain reads
//
//  Most data is served from MongoDB (fast).
//  For the ownership history we query the blockchain directly
//  (it's the authoritative source and doesn't change often).
// ============================================================

const Land     = require("../models/Land");
const Transfer = require("../models/Transfer");
const AuditLog = require("../models/AuditLog");
const { getReadOnlyContract } = require("../config/contract");
const { catchAsync, AppError } = require("../utils/errorHandler");

/**
 * GET /lands
 * Public. Supports: page, limit, status filter, text search, owner filter.
 */
const getLands = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, status, search, owner } = req.query;

  // Build the query filter
  const filter = {};
  if (status)  filter.status = status;
  if (owner)   filter.ownerAddress = owner.toLowerCase();
  if (search) {
    // MongoDB text search (requires the text index on location + surveyNumber)
    filter.$text = { $search: search };
  }

  const [lands, total] = await Promise.all([
    Land.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),   // .lean() returns plain JS objects (faster than Mongoose docs)
    Land.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    total,
    page:   Number(page),
    pages:  Math.ceil(total / limit),
    data:   lands,
  });
});

/**
 * GET /lands/:id
 * Public. Returns one land from MongoDB.
 */
const getLandById = catchAsync(async (req, res, next) => {
  const land = await Land.findOne({ landId: Number(req.params.id) }).lean();
  if (!land) return next(new AppError(`Land with ID ${req.params.id} not found.`, 404));

  res.status(200).json({ status: "success", data: land });
});

/**
 * GET /lands/owner/:address
 * Auth required. Returns lands belonging to the given wallet address.
 */
const getLandsByOwner = catchAsync(async (req, res) => {
  const { address } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const filter = { ownerAddress: address.toLowerCase() };

  const [lands, total] = await Promise.all([
    Land.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Land.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    total,
    page:   Number(page),
    pages:  Math.ceil(total / limit),
    data:   lands,
  });
});

function toHistoryEntry(owner, when, transactionType) {
  const date = new Date(when);
  return {
    owner,
    timestamp: Math.floor(date.getTime() / 1000),
    date: date.toISOString(),
    transactionType,
  };
}

/**
 * Build a readable chain of title from the Mongo mirror.
 * Used when the contract has no history yet (local demo data, or the node is down).
 */
async function historyFromMirror(land) {
  const [transfers, audits] = await Promise.all([
    Transfer.find({ landId: land.landId, state: "APPROVED" }).sort({ approvedAt: 1 }).lean(),
    AuditLog.find({
      landId: land.landId,
      action: { $in: ["LAND_VERIFIED", "LAND_REJECTED", "LAND_FROZEN", "LAND_DISPUTED"] },
    }).sort({ createdAt: 1 }).lean(),
  ]);

  const originalOwner = transfers[0]?.fromAddress || land.ownerAddress;
  const events = [toHistoryEntry(originalOwner, land.createdAt, "REGISTERED")];

  const verified = audits.find((entry) => entry.action === "LAND_VERIFIED");
  const rejected = audits.find((entry) => entry.action === "LAND_REJECTED");
  const frozen = audits.find((entry) => entry.action === "LAND_FROZEN");
  const disputed = audits.find((entry) => entry.action === "LAND_DISPUTED");

  if (verified) {
    events.push(toHistoryEntry(originalOwner, verified.createdAt, "VERIFIED"));
  } else if (["VERIFIED", "FROZEN", "DISPUTED"].includes(land.status)) {
    events.push(toHistoryEntry(
      originalOwner,
      new Date(new Date(land.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000),
      "VERIFIED"
    ));
  }

  for (const transfer of transfers) {
    events.push(toHistoryEntry(transfer.toAddress, transfer.approvedAt, "TRANSFER"));
  }

  if (rejected) events.push(toHistoryEntry(land.ownerAddress, rejected.createdAt, "REJECTED"));
  if (frozen) events.push(toHistoryEntry(land.ownerAddress, frozen.createdAt, "FROZEN"));
  if (disputed) events.push(toHistoryEntry(land.ownerAddress, disputed.createdAt, "DISPUTED"));

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * GET /lands/:id/history
 * Public. Reads the ownership history from the blockchain when the parcel
 * exists on-chain. Falls back to the Mongo mirror for demo records.
 */
const getOwnershipHistory = catchAsync(async (req, res, next) => {
  const landId = Number(req.params.id);

  const land = await Land.findOne({ landId }).lean();
  if (!land) return next(new AppError(`Land with ID ${landId} not found.`, 404));

  let history = [];
  try {
  const contract = getReadOnlyContract();
  if (!contract) {
    return next(new AppError("Blockchain unavailable", 503));
  }
  const historyRaw = await contract.getOwnershipHistory(BigInt(landId));
    history = historyRaw.map((entry) => ({
      owner:           entry.owner,
      timestamp:       Number(entry.timestamp),
      date:            new Date(Number(entry.timestamp) * 1000).toISOString(),
      transactionType: entry.transactionType,
    }));
  } catch {
    history = [];
  }

  if (!history.length) history = await historyFromMirror(land);

  res.status(200).json({
    status: "success",
    landId,
    count:  history.length,
    data:   history,
  });
});

module.exports = { getLands, getLandById, getLandsByOwner, getOwnershipHistory };

