// routes/admin.routes.js
const express = require("express");
const router  = express.Router();
const adminController = require("../controllers/admin.controller");
const { protect }     = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

// All admin routes require authentication AND admin role
router.use(protect, requireRole("admin"));

router.get("/stats",             adminController.getStats);
router.get("/pending",           adminController.getPendingLands);
router.get("/pending-transfers", adminController.getPendingTransfers);
router.get("/audit-logs",        adminController.getAuditLogs);
router.get("/export",            adminController.exportLands);

module.exports = router;

