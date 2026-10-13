// controllers/admin.controller.js
// ============================================================
//  Admin Controller — stats, audit logs, export, pending queues
//
//  All routes here require: protect + requireRole("admin")
// ============================================================

const Land       = require("../models/Land");
const Transfer   = require("../models/Transfer");
const User       = require("../models/User");
const AuditLog   = require("../models/AuditLog");
const { catchAsync } = require("../utils/errorHandler");
const { exportLandsToCSV } = require("../utils/csvExport");
const fs = require("fs");

/**
 * GET /admin/stats
 * Returns key numbers for the admin dashboard cards and charts.
 */
const getStats = catchAsync(async (req, res) => {
  // Run all queries in parallel with Promise.all for speed
  const [
    totalLands,
    pendingLands,
    verifiedLands,
    rejectedLands,
    frozenLands,
    totalUsers,
    totalTransfers,
    pendingTransfers,
    approvedTransfers,
    // Transfers per month for the last 6 months (for Recharts)
    transfersPerMonth,
  ] = await Promise.all([
    Land.countDocuments(),
    Land.countDocuments({ status: "PENDING" }),
    Land.countDocuments({ status: "VERIFIED" }),
    Land.countDocuments({ status: "REJECTED" }),
    Land.countDocuments({ status: "FROZEN" }),
    User.countDocuments(),
    Transfer.countDocuments(),
    Transfer.countDocuments({ state: { $in: ["INITIATED", "BUYER_ACCEPTED"] } }),
    Transfer.countDocuments({ state: "APPROVED" }),

    // MongoDB aggregation: group transfers by year-month
    Transfer.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // last 6 months
          },
        },
      },
      {
        $group: {
          _id: {
            year:  { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          _id:   0,
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          count: 1,
        },
      },
    ]),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      lands: {
        total:    totalLands,
        pending:  pendingLands,
        verified: verifiedLands,
        rejected: rejectedLands,
        frozen:   frozenLands,
      },
      users: { total: totalUsers },
      transfers: {
        total:    totalTransfers,
        pending:  pendingTransfers,
        approved: approvedTransfers,
      },
      charts: {
        transfersPerMonth,
      },
    },
  });
});

/**
 * GET /admin/pending
 * Returns lands awaiting verification, sorted oldest first.
 */
const getPendingLands = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const [lands, total] = await Promise.all([
    Land.find({ status: "PENDING" })
      .sort({ createdAt: 1 })     // Oldest first (FIFO queue)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Land.countDocuments({ status: "PENDING" }),
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
 * GET /admin/pending-transfers
 * Returns transfers awaiting admin approval (state = BUYER_ACCEPTED).
 */
const getPendingTransfers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const [transfers, total] = await Promise.all([
    Transfer.find({ state: "BUYER_ACCEPTED" })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Transfer.countDocuments({ state: "BUYER_ACCEPTED" }),
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
 * GET /admin/audit-logs
 * Returns paginated audit log, newest first. Supports filter by action and landId.
 */
const getAuditLogs = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, action, landId } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (landId) filter.landId = Number(landId);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    total,
    page:   Number(page),
    pages:  Math.ceil(total / limit),
    data:   logs,
  });
});

/**
 * GET /admin/export
 * Generates and streams a CSV file of all lands to the browser.
 */
const exportLands = catchAsync(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const lands = await Land.find(filter).sort({ landId: 1 }).lean();
  const filePath = await exportLandsToCSV(lands);

  // Set headers so browser downloads the file instead of displaying it
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="lands-export-${Date.now()}.csv"`
  );

  // Stream the file and delete it after sending
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on("end", () => {
    fs.unlink(filePath, () => {}); // Delete temp file (ignore errors)
  });
});

module.exports = { getStats, getPendingLands, getPendingTransfers, getAuditLogs, exportLands };

