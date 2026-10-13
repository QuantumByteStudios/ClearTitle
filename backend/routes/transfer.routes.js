// routes/transfer.routes.js
const express = require("express");
const router  = express.Router();
const transferController = require("../controllers/transfer.controller");
const { protect }        = require("../middleware/auth.middleware");
const { validate, schemas } = require("../middleware/validate.middleware");

// GET /transfers             → my transfers (as buyer or seller)
router.get("/", protect, transferController.getMyTransfers);

// GET /transfers/active/:landId → active transfer for a land
router.get("/active/:landId", protect, transferController.getActiveTransfer);

// GET /transfers/:landId     → all transfers for a land
router.get("/:landId",
  protect,
  validate(schemas.landIdParamAsLandId),
  transferController.getTransfersByLand
);

module.exports = router;

