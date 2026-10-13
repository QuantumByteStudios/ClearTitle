// routes/auth.routes.js
const express = require("express");
const router  = express.Router();
const authController = require("../controllers/auth.controller");
const { protect }    = require("../middleware/auth.middleware");
const { validate, schemas } = require("../middleware/validate.middleware");

// GET  /auth/nonce/:address  → get sign message
router.get("/nonce/:address", validate(schemas.getNonce), authController.getNonce);

// POST /auth/verify          → verify signature, get JWT
router.post("/verify", validate(schemas.verifySignature), authController.verifySignature);

// GET  /auth/me              → get current user profile
router.get("/me", protect, authController.getMe);

// PATCH /auth/role           → update user role
router.patch("/role", protect, authController.updateRole);

module.exports = router;

