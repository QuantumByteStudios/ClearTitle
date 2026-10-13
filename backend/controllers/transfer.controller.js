// controllers/transfer.controller.js
// ============================================================
//  Transfer Controller — read transfer data from MongoDB
//
//  Note: Transfer STATE CHANGES (initiate, accept, approve, reject)
//  happen on the BLOCKCHAIN via the frontend calling the contract
//  directly with MetaMask. The backend event listener then picks
//  up those events and updates MongoDB.
//
//  This controller only handles READ operations (querying MongoDB).
// ============================================================

const Transfer = require("../models/Transfer");
const { catchAsync, AppError } = require("../utils/errorHandler");

/**
 * GET /transfers
 * Auth required. Returns transfers where user is buyer or seller.
 */
const getMyTransfers = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, state } = req.query;
  const address = req.user.address;

  const filter = {
    $or: [{ fromAddress: address }, { toAddress: address }],
  };
  if (state) filter.state = state;

  const [transfers, total] = await Promise.all([
    Transfer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Transfer.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    total,
    page:   Number(page),
    pages:  Math.ceil(total / limit),
    data:   transfers,
  });
});

/**
 * GET /transfers/:landId
 * Auth required. Returns all transfers for a specific land.
 */
const getTransfersByLand = catchAsync(async (req, res, next) => {
  const landId = Number(req.params.landId);

  const transfers = await Transfer.find({ landId }).sort({ createdAt: -1 }).lean();
  if (!transfers.length) {
    return next(new AppError(`No transfers found for land ID ${landId}.`, 404));
  }

  res.status(200).json({
    status: "success",
    count:  transfers.length,
    data:   transfers,
  });
});

/**
 * GET /transfers/active/:landId
 * Returns the currently active (INITIATED or BUYER_ACCEPTED) transfer for a land.
 */
const getActiveTransfer = catchAsync(async (req, res) => {
  const landId = Number(req.params.landId);

  const transfer = await Transfer.findOne({
    landId,
    state: { $in: ["INITIATED", "BUYER_ACCEPTED"] },
  }).lean();

  res.status(200).json({
    status: "success",
    data:   transfer || null,
  });
});

module.exports = { getMyTransfers, getTransfersByLand, getActiveTransfer };

