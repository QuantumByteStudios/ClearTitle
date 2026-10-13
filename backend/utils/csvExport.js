// utils/csvExport.js
// ============================================================
//  CSV Export Utility — for admin data export
// ============================================================

const { createObjectCsvWriter } = require("csv-writer");
const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");

/**
 * Export lands data to a CSV file and return the file path.
 * @param {Array} lands - Array of Land documents from MongoDB
 * @returns {string} filePath - absolute path to the generated CSV
 */
const exportLandsToCSV = async (lands) => {
  // Ensure the temp directory exists
  const dir = path.join(__dirname, "../temp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `lands-export-${Date.now()}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "landId",       title: "Land ID" },
      { id: "surveyNumber", title: "Survey Number" },
      { id: "area",         title: "Area (sq m)" },
      { id: "location",     title: "Location" },
      { id: "ownerAddress", title: "Owner Address" },
      { id: "priceEth",     title: "Price (ETH)" },
      { id: "ipfsHash",     title: "IPFS Hash" },
      { id: "status",       title: "Status" },
      { id: "txHash",       title: "Transaction Hash" },
      { id: "createdAt",    title: "Registered At" },
    ],
  });

  const records = lands.map((l) => ({
    landId:       l.landId,
    surveyNumber: l.surveyNumber,
    area:         l.area,
    location:     l.location,
    ownerAddress: l.ownerAddress,
    priceEth:     ethers.formatEther(l.price || "0"),
    ipfsHash:     l.ipfsHash,
    status:       l.status,
    txHash:       l.txHash || "",
    createdAt:    l.createdAt ? new Date(l.createdAt).toISOString() : "",
  }));

  await csvWriter.writeRecords(records);
  return filePath;
};

module.exports = { exportLandsToCSV };

