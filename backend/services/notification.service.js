// services/notification.service.js
const Notification = require("../models/Notification");
const logger = require("../utils/logger");

/**
 * Send a notification to one or more users.
 * Silently logs on failure — notifications should never crash the main flow.
 *
 * @param {string|string[]} userAddress - Single address or array of addresses
 * @param {string} title
 * @param {string} message
 * @param {string} type  - Must match Notification.type enum
 * @param {number} [landId]
 * @param {string} [link]
 */
const sendNotification = async (userAddress, title, message, type, landId = null, link = null) => {
  try {
    const addresses = Array.isArray(userAddress) ? userAddress : [userAddress];
    const docs = addresses.map((addr) => ({
      userAddress: addr.toLowerCase(),
      title,
      message,
      type,
      landId,
      link,
    }));
    await Notification.insertMany(docs);
  } catch (err) {
    logger.error(`⚠️  Failed to send notification: ${err.message}`);
  }
};

module.exports = { sendNotification };

