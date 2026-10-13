// controllers/notification.controller.js
const Notification = require("../models/Notification");
const { catchAsync, AppError } = require("../utils/errorHandler");

/**
 * GET /notifications
 * Auth required. Returns notifications for the logged-in user.
 */
const getNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const address = req.user.address;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userAddress: address })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments({ userAddress: address }),
    Notification.countUnread(address),
  ]);

  res.status(200).json({
    status: "success",
    total,
    unreadCount,
    page:   Number(page),
    pages:  Math.ceil(total / limit),
    data:   notifications,
  });
});

/**
 * PATCH /notifications/:id/read
 * Marks a single notification as read.
 */
const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userAddress: req.user.address },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found.", 404));
  }

  res.status(200).json({ status: "success", data: notification });
});

/**
 * PATCH /notifications/read-all
 * Marks all notifications as read for the logged-in user.
 */
const markAllAsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userAddress: req.user.address, read: false },
    { read: true, readAt: new Date() }
  );

  res.status(200).json({ status: "success", message: "All notifications marked as read." });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };

