// routes/notification.routes.js
const express = require("express");
const router  = express.Router();
const notificationController = require("../controllers/notification.controller");
const { protect }            = require("../middleware/auth.middleware");
const { validate, schemas }  = require("../middleware/validate.middleware");

router.use(protect);  // All notification routes require authentication

router.get("/",              validate(schemas.pagination), notificationController.getNotifications);
router.patch("/read-all",    notificationController.markAllAsRead);
router.patch("/:id/read",    notificationController.markAsRead);

module.exports = router;

