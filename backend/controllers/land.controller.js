// controllers/land.controller.js
// ============================================================
//  Land Controller — CRUD + Blockchain reads
//
//  Most data is served from MongoDB (fast).
//  For the ownership history we query the blockchain directly
//  (it's the authoritative source and doesn't change often).
// ============================================================

const Land    = require("../models/Land");
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

/**
 * GET /lands/:id/history
 * Public. Reads the ownership history directly from the blockchain.
 * This is the AUTHORITATIVE source — not MongoDB.
 */
const getOwnershipHistory = catchAsync(async (req, res, next) => {
  const landId = Number(req.params.id);

  // First check the land exists in our DB (quick check)
  const land = await Land.findOne({ landId }).lean();
  if (!land) return next(new AppError(`Land with ID ${landId} not found.`, 404));

  // Query the blockchain for history (array of HistoryEntry structs)
  const contract = getReadOnlyContract();
  const historyRaw = await contract.getOwnershipHistory(BigInt(landId));

  // Convert BigInt timestamps to human-readable dates
  const history = historyRaw.map((entry) => ({
    owner:           entry.owner,
    timestamp:       Number(entry.timestamp),
    date:            new Date(Number(entry.timestamp) * 1000).toISOString(),
    transactionType: entry.transactionType,
  }));

  res.status(200).json({
    status: "success",
    landId,
    count:  history.length,
    data:   history,
  });
});

module.exports = { getLands, getLandById, getLandsByOwner, getOwnershipHistory };

