// services/audit.service.js
const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

/**
 * Write an immutable audit log entry.
 * Call this after every admin action.
 *
 * @param {object} params
 * @param {string} params.action       - Action enum value (e.g. "LAND_VERIFIED")
 * @param {string} params.performedBy  - Admin wallet address
 * @param {number} [params.landId]     - Affected land ID
 * @param {string} [params.txHash]     - Blockchain tx hash
 * @param {number} [params.blockNumber]
 * @param {string} [params.targetAddress]
 * @param {object} [params.metadata]   - Extra context
 * @param {string} [params.ipAddress]
 */
const writeAuditLog = async ({
  action,
  performedBy,
  landId        = null,
  txHash        = null,
  blockNumber   = null,
  targetAddress = null,
  metadata      = {},
  ipAddress     = null,
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy: performedBy.toLowerCase(),
      landId,
      txHash,
      blockNumber,
      targetAddress: targetAddress?.toLowerCase() || null,
      metadata,
      ipAddress,
    });
  } catch (err) {
    // Don't let a logging failure crash the main request
    logger.error(`⚠️  Failed to write audit log: ${err.message}`);
  }
};

module.exports = { writeAuditLog };

