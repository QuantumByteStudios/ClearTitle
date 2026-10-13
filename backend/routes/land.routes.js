// routes/land.routes.js
const express = require("express");
const router  = express.Router();
const landController = require("../controllers/land.controller");
const { protect }    = require("../middleware/auth.middleware");
const { validate, schemas } = require("../middleware/validate.middleware");

// GET /lands              → paginated, filterable land list (public)
router.get("/", validate(schemas.getLands), landController.getLands);

// GET /lands/owner/:address → lands by wallet (auth required)
// ⚠️ This MUST be above /lands/:id to avoid Express matching "owner" as an id
router.get("/owner/:address",
  protect,
  validate(schemas.ownerParam),
  landController.getLandsByOwner
);

// GET /lands/:id          → single land details (public)
router.get("/:id",
  validate(schemas.landIdParam),
  landController.getLandById
);

// GET /lands/:id/history  → on-chain ownership history (public)
router.get("/:id/history",
  validate(schemas.landIdParam),
  landController.getOwnershipHistory
);

module.exports = router;

